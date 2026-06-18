# Repo Intelligence Router

## Purpose

Define the target operating model for large repositories: do not ask an agent to know the whole repo. Build a repo intelligence layer that routes each task to a small, typed context packet with line ranges, reasons, confidence, and validation hints.

This doc is about reducing wasted context and agent loops. MCP is only the transport surface; the value comes from bounded tools that return precise context instead of dumping files.

## Source of Truth

- `.github/docs/prompt-and-context.md`
- `.github/docs/tool-runtime.md`
- `.github/scripts/repo-index.js`
- `docs/ai/00-repo-index.md` when generated
- `specs/012-repo-intelligence-context-router/`

## Core Rule

Large-repo agent quality is optimized for:

```text
high context precision
+ low uncached input
+ low tool-result verbosity
+ low agent loop count
+ high validation signal
```

Do not optimize for making the model see more of the repo. Optimize for making every request receive the smallest useful packet of domain rules, symbols, snippets, related files, and tests.

## Context Packet Shape

Before a coding agent edits files, the router should assemble a packet like:

```md
# Task
<one-paragraph task summary>

# Domain Rules
- <business invariant, source-backed>

# Candidate Files
1. path/to/file.ts:42-118
   Reason: <why this range matters>
   Confidence: 0.88

# Editable Snippets
<small line ranges only>

# Related Tests
- path/to/test.spec.ts

# Validation
- <targeted command>
```

The packet should usually fit within 10k-30k input tokens. Complex cross-domain tasks can exceed that, but only after the router explains what extra context is missing.

## Tool Groups

Expose tools by task, not all at once.

| Group | Purpose | Example tools |
|---|---|---|
| `repo-read` | Find entrypoints, symbols, slices, related files | `repo.search_code`, `repo.lookup_symbol`, `repo.get_file_slice` |
| `graph` | Traverse import, call, route, event, table, and test relationships | `graph.neighbors`, `graph.impact`, `graph.shortest_path` |
| `tests` | Find and run the smallest useful validation set | `test.find_related`, `test.run_targeted`, `test.explain_failure` |
| `domain-docs` | Load compact business rules and invariants | `domain.get_rules`, `domain.get_flow`, `domain.get_pitfalls` |
| `git-history` | Explain why a fragile area changed | `git.recent_changes`, `git.blame_summary`, `git.why_changed` |
| `guards` | Check diffs deterministically before another model loop | `guard.check_diff`, `guard.check_arch_boundary`, `guard.suggest_validation` |

For architecture questions, expose `repo-read`, `graph`, and `domain-docs`. For bug fixes, expose `repo-read`, `graph`, and `tests`. For PR automation, add GitHub metadata. Keep write and shell tools separate from read routing.

## Tool Result Contract

Every repo intelligence tool should follow these rules:

- one tool has one clear intent
- output has `max_chars`
- no full file by default
- return `symbol_id`, file path, line range, and confidence before content
- include `why_relevant`
- include `omitted` counts when results are clipped
- include a suggested next action
- support summary mode before detail mode
- treat generated, build, vendor, snapshot, lock, and minified files as low-signal by default

Preferred result shape:

```json
{
  "results": [
    {
      "file": "packages/payment/src/refund/RefundService.ts",
      "symbol": "RefundService.createRefund",
      "lines": "42-118",
      "snippet": "<= 1200 chars",
      "why_relevant": "handles refund idempotency",
      "confidence": 0.88
    }
  ],
  "omitted": 17,
  "next_action": "call repo.get_symbol_context on RefundService.createRefund"
}
```

## Progressive Disclosure Budget

Default budget before edit:

| Budget | Limit |
|---|---:|
| Tool calls before first edit | 8 |
| Candidate files before first edit | 8 |
| Full files before first edit | 2 |
| Test log characters | 12,000 |
| Repair loops | 2 |

When a task exceeds the budget, the agent should stop and state what context is missing instead of continuing broad exploration.

## Index Strategy

Use deterministic indexing first:

1. `git ls-files` for tracked file inventory
2. build markers for modules and validation commands
3. tree-sitter, ctags, AST tools, LSP, or SCIP/LSIF for symbols and edges
4. embeddings over symbol or chunk summaries, not whole files
5. summary caches keyed by file blob hash and symbol range hash

Use LLMs for summary cache generation only when deterministic parsing is insufficient.

## Validation Strategy

The router should reduce repair loops by giving the coder agent:

- related tests before edit
- targeted validation commands
- clipped failure explanations
- deterministic guard output for architecture, security, type, lint, and style checks

Run the smallest meaningful checks first. Full-suite validation is a release or high-blast-radius step, not the default first loop.

## Common Failure Modes

- Adding many MCP servers and assuming token use improves automatically.
- Returning 50 search hits with long snippets.
- Reading full files before deciding whether they are edit candidates.
- Letting the model self-grep for domain boundaries in a 10k-60k file repo.
- Passing full logs back to the model instead of failure-focused excerpts.
- Treating vector search as enough for exact symbols, routes, event names, and schemas.

## Related Files

- `.github/docs/prompt-and-context.md`
- `.github/docs/tool-runtime.md`
- `.github/docs/team-operating-model.md`
- `specs/012-repo-intelligence-context-router/spec.md`
