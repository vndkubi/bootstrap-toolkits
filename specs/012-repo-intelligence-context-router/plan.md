# Repo Intelligence Context Router — Implementation Plan

> Spec: ./spec.md
> Date: 2026-05-22
> Status: Draft v0.1

## 0. Decision Record

| # | Decision | Rationale |
|---|---|---|
| D1 | Treat MCP as transport, not intelligence | Token reduction comes from bounded, typed tool results. |
| D2 | Use deterministic indexing before embeddings | File inventory, symbols, and graph edges are cheaper and more reliable than whole-file semantic search. |
| D3 | Return context packets, not file dumps | Agents need task-ready slices with rules, tests, confidence, and validation. |
| D4 | Expose toolsets by task | Too many visible tools can degrade tool selection and increase schema overhead. |
| D5 | Make write and shell tools separate | The router should be read-only by default and safe for autonomous lookup. |
| D6 | Cache summaries by git object identity | Path-based summary caches go stale when files move or ranges change. |

## 1. Architecture

```text
User task
  -> task classifier
  -> context planner
  -> hybrid retrieval
  -> graph expansion
  -> context budgeter
  -> context packet
  -> coder agent
  -> targeted validation
  -> guard checks
  -> telemetry and summary cache update
```

Only the coder agent requires a strong model. The classifier, planner, retrieval, budgeter, validation routing, and guard checks should be deterministic or use smaller models only where necessary.

## 2. Package Layout

```text
repo_intel/
  src/repo_intel/
    cli.py
    indexer/
      files.py
      symbols.py
      edges.py
      summaries.py
    retrieval/
      exact.py
      semantic.py
      hybrid.py
      rerank.py
    router/
      classify.py
      plan.py
      packet.py
      budget.py
    tools/
      repo.py
      graph.py
      tests.py
      domain.py
      history.py
      guard.py
    storage/
      sqlite.py
      schema.sql
    mcp_server.py
```

The existing `.github/scripts/repo-index.js` remains the portable bootstrap seed. The router implementation can later consume its JSON output as a cheap first-pass inventory.

## 3. Tool Surface

Tool contracts live in `contracts/repo-intel-tools.schema.json`; the final packet contract lives in `contracts/context-packet.schema.json`.

### MVP

| Group | Tools |
|---|---|
| `repo-read` | `repo.search_code`, `repo.lookup_symbol`, `repo.get_file_slice`, `repo.get_related_files`, `repo.get_module_summary` |
| `tests` | `test.find_related`, `test.run_targeted` |
| `context` | `context.build_packet`, `context.explain_omissions` |

### v1

| Group | Tools |
|---|---|
| `graph` | `graph.neighbors`, `graph.callers`, `graph.callees`, `graph.impact`, `graph.shortest_path` |
| `domain-docs` | `domain.get_rules`, `domain.get_invariants`, `domain.get_flow`, `domain.get_pitfalls` |
| `git-history` | `git.recent_changes`, `git.blame_summary`, `git.why_changed` |
| `guards` | `guard.check_diff`, `guard.check_arch_boundary`, `guard.check_security`, `guard.suggest_validation` |

## 4. Retrieval Strategy

Candidate scoring:

```text
candidate_score =
  exact_match_score
+ semantic_score
+ symbol_graph_score
+ import_or_call_proximity
+ git_recency
+ test_relation
+ domain_match
- generated_vendor_penalty
```

Retrieval order:

1. Exact search using ripgrep or git grep.
2. Symbol lookup using tree-sitter, ctags, LSP, or SCIP/LSIF when available.
3. Semantic search over symbol and chunk summaries.
4. Graph expansion depth 1-2.
5. Diversity rerank so the packet does not contain many near-duplicate snippets from one file.

## 5. Context Budget

Default allocation:

| Section | Budget |
|---|---:|
| Task summary | 500-1,000 tokens |
| Repo/global instructions | 500-1,500 tokens |
| Domain rules | 1,000-3,000 tokens |
| Candidate snippets | 4,000-12,000 tokens |
| Related contracts/types | 2,000-8,000 tokens |
| Validation commands | 500-1,500 tokens |

Hard defaults:

- max tool calls before edit: 8
- max files before edit: 8
- max full files before edit: 2
- max test log chars: 12,000
- max repair loops: 2

## 6. Index Schema

The index can start in SQLite:

```text
files(path, language, size, hash, module, generated_flag, vendor_flag)
symbols(symbol_id, name, kind, file, line_start, line_end, signature, exported, doc_summary)
edges(from_symbol, to_symbol, relation, confidence)
chunks(chunk_id, file, symbol_id, text_hash, summary, embedding_ref)
tests(test_id, file, covers_symbol, command, avg_runtime, flaky_score)
domain_rules(domain, invariant, source_path, confidence)
summary_cache(cache_key, kind, summary, generated_at)
```

Update flow:

```text
git diff --name-only main...HEAD
  -> reparse changed files
  -> update file/symbol/edge/chunk rows
  -> invalidate summaries by hash
  -> refresh impacted tests
```

## 7. Phasing

| Milestone | Scope | Exit criteria |
|---|---|---|
| M0 | Seed docs and contracts | Spec, data model, packet schema, and router guide exist |
| M1 | File inventory and slices | `repo.get_file_slice` returns clipped line ranges with confidence |
| M2 | Search and symbol lookup | `repo.search_code` and `repo.lookup_symbol` return top-k bounded results |
| M3 | Context packet builder | `context.build_packet` assembles task, rules, snippets, tests, validation |
| M4 | Test impact | related test commands and clipped logs are returned |
| M5 | Graph and domain rules | impact expansion and compact invariants work |
| M6 | Eval suite | historical tasks measure accepted patch rate, tokens, tool calls, repair loops |

## 8. Verification

- Schema tests for every tool output.
- Golden tests for context packet clipping and omissions.
- Fixture repos for generated/vendor exclusion.
- Targeted test impact checks for JS/TS, Java, Go, .NET, and Python examples.
- Eval suite from historical tasks:
  - accepted patch rate
  - tests pass rate
  - files touched precision
  - tokens per accepted patch
  - tool calls per task
  - repair loops per task

Primary metric: credits per accepted useful change.
