# Repo Intelligence Context Router — Specification

> Status: Draft v0.1
> Date: 2026-05-22
> Related: specs/011-bootstrap-mcp-server/, `.github/docs/repo-intelligence-router.md`

## 1. Executive Summary

Large repositories do not need agents that "know the whole repo." They need a deterministic repo intelligence layer that turns a task into a compact context packet: domain rules, relevant symbols, line ranges, related tests, confidence, and validation commands.

This feature specifies a repo intelligence and context router surface for Copilot, Codex, and MCP-compatible agents. MCP is treated as the tool gateway, not the main optimization. The optimization is typed, bounded tool results that prevent whole-repo scans, full-file dumps, and long repair loops.

## 2. Problem Statement

Current large-repo agent workflows often fail in predictable ways:

| Gap | Symptom | Impact |
|---|---|---|
| Broad repo exploration | Agent greps and reads unrelated files | High token use and weak precision |
| Full-file results | Tools return thousands of lines too early | Context budget is spent before edit candidates are known |
| Weak domain routing | Business rules are rediscovered from code every task | Repeated mistakes and slow starts |
| No graph expansion | Semantic search misses callers, routes, tests, schemas, events | Incomplete blast-radius analysis |
| Poor test impact | Agent runs too much or reads full failure logs | Expensive repair loops |
| Too many exposed tools | Agent sees irrelevant capabilities | Tool choice quality degrades |

## 3. Desired State

1. A local repo intelligence index stores files, symbols, edges, chunks, tests, domain rules, and cached summaries.
2. A context router converts each user task into a small context packet before a coder agent edits.
3. Tools return metadata first and detail only on request.
4. Every returned snippet has file path, symbol or line range, relevance reason, and confidence.
5. Test impact and guard tools provide fast validation signals.
6. Toolsets expose only the groups needed for the current task.
7. The system measures context precision, tool calls, repair loops, and credits per accepted useful change.

## 4. User Stories

### US-1: Find focused entrypoints

As a developer working in a large repo, I want the router to identify the most likely domain and entrypoints for my request, so that the agent starts from the right files without scanning the repo.

Acceptance criteria:

- Given a task description, `repo.find_entrypoints` returns at most 8 candidate symbols/files by default.
- Each result includes `file`, `lines`, `symbol`, `why_relevant`, and `confidence`.
- Generated, vendor, build, lock, minified, and snapshot files are penalized unless the task explicitly targets them.

### US-2: Build a bounded context packet

As a coding agent, I want a packet with rules, snippets, contracts, and tests, so that I can implement without reading unrelated files.

Acceptance criteria:

- `context.build_packet` returns task summary, domain rules, candidate files, editable snippets, related tests, and validation commands.
- The default packet budget is configurable and defaults to a 30k-token estimate.
- Full files are not included unless explicitly requested or the file is already selected for editing.

### US-3: Traverse repo graph

As a maintainer, I want the router to expand from a symbol through callers, callees, imports, events, schemas, DB tables, and tests, so that impact analysis is not search-only.

Acceptance criteria:

- `graph.neighbors`, `graph.impact`, and `graph.shortest_path` operate on stable `symbol_id` or file ids.
- Graph results include relation type and confidence.
- Expansion defaults to depth 1 and has hard max depth and max result caps.

### US-4: Route tests before repair loops

As an agent, I want related tests and clipped failures, so that I can validate changes without reading full logs or running the whole suite first.

Acceptance criteria:

- `test.find_related` maps changed files/symbols to likely tests and commands.
- `test.run_targeted` clips logs to relevant failures using `max_log_chars`.
- `test.explain_failure` returns a short failure summary, failing assertion, likely file anchors, and suggested next read.

### US-5: Load business rules as contracts

As a developer, I want compact domain rules and invariants to be available before code edits, so that the agent does not infer critical behavior from implementation details alone.

Acceptance criteria:

- `domain.get_rules`, `domain.get_invariants`, and `domain.get_flow` read compact docs under `docs/ai/domains/` or generated equivalents.
- Missing or stale domain docs are reported as confidence gaps, not silently invented.

### US-6: Use history and guards sparingly

As a reviewer, I want fragile historical context and deterministic guard checks surfaced only when relevant, so that the agent avoids known regressions without bloating every task.

Acceptance criteria:

- `git.recent_changes`, `git.blame_summary`, and `git.why_changed` return summarized history with changed files and key lesson.
- `guard.check_diff`, `guard.check_arch_boundary`, `guard.check_security`, and `guard.suggest_validation` run deterministic checks where possible.
- Guard output is summarized and clipped before model re-entry.

## 5. Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Provide a local index builder that reads tracked files and detects generated/vendor/build artifacts. |
| FR-2 | Store files, symbols, edges, chunks, tests, domain rules, and summary cache entries. |
| FR-3 | Expose MCP-compatible tool schemas for repo-read, graph, tests, domain-docs, git-history, and guards. |
| FR-4 | Enforce `max_chars`, `top_k`, pagination, and summary-first output on every read tool. |
| FR-5 | Return line ranges and confidence for every code result. |
| FR-6 | Build task-level context packets with explicit token estimates and omissions. |
| FR-7 | Support incremental re-indexing from `git diff --name-only <base>...HEAD`. |
| FR-8 | Provide deterministic validation and guard hooks before asking a model to repair. |
| FR-9 | Record telemetry: packet size, tool calls, files touched, tests run, repair loops, and accepted patch outcome. |

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Default packet budget | 10k-30k estimated tokens |
| NFR-2 | Search result size | `max_chars` default 6,000 |
| NFR-3 | File slice size | `max_chars` default 8,000 |
| NFR-4 | Test log size | `max_log_chars` default 12,000 |
| NFR-5 | Pre-edit exploration | <= 8 tool calls, <= 8 candidate files, <= 2 full files |
| NFR-6 | Safety | Read-only by default, write/shell tools separate, path allowlist enforced |
| NFR-7 | Cache stability | Summary cache keyed by git blob hash plus symbol range hash |

## 7. Scope

### In scope

- Repo index and context router design
- MCP-compatible contracts for bounded tool results
- Context packet schema
- Toolset grouping guidance
- Test impact and validation routing
- Domain invariant and repo memory integration
- Metrics for evaluation

### Out of scope

- Replacing GitHub Copilot repository indexing
- Replacing IDE-native semantic search
- Hosted SaaS deployment
- Unrestricted shell or write tools
- Requiring an LLM inside the router

## 8. Assumptions

- Git is available for most target repos.
- Deterministic parsing should be preferred over LLM inference.
- Embeddings are optional and run over function/chunk summaries, not full files.
- The coder agent can request more context after the router packet, but must justify why.

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Index misses dynamic behavior | Medium | Medium | Allow confidence gaps and targeted fallback reads |
| Tool schemas become too broad | Medium | High | Keep one tool per intent and group by toolset |
| Stale summaries | Medium | High | Hash-based cache invalidation |
| Search overfits one file | Medium | Medium | Rerank with diversity/MMR and graph expansion |
| Domain docs drift | Medium | High | Drift detection and source-backed invariants |
| Guard checks become slow | Medium | Medium | Run targeted checks first and cap logs |

## 10. Next Step

Implement MVP in this order:

1. Extend deterministic repo indexing into a small SQLite-backed inventory.
2. Add `repo.search_code`, `repo.lookup_symbol`, `repo.get_file_slice`, `repo.get_related_files`, and `context.build_packet`.
3. Add `test.find_related` and `test.run_targeted`.
4. Add graph edges and domain invariant docs.
5. Build an eval suite from 30-100 historical tasks and measure credits per accepted useful change.
