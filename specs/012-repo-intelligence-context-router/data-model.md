# Repo Intelligence Context Router — Data Model

> Spec: ./spec.md
> Plan: ./plan.md
> Date: 2026-05-22

## Entities

### FileRecord

| Field | Type | Notes |
|---|---|---|
| `path` | string | Repo-relative POSIX path |
| `language` | string | Best-effort language id |
| `size_bytes` | integer | Used for clipping and exclusion |
| `blob_hash` | string | Git blob hash when available |
| `module` | string | Owning module root |
| `is_generated` | boolean | Generated/build/minified/snapshot flag |
| `is_vendor` | boolean | Vendor/dependency flag |

### SymbolRecord

| Field | Type | Notes |
|---|---|---|
| `symbol_id` | string | Stable id: path plus symbol path plus range hash |
| `name` | string | Symbol display name |
| `kind` | enum | function, method, class, interface, enum, route, schema, table, event |
| `file` | string | Repo-relative path |
| `line_start` | integer | 1-based |
| `line_end` | integer | 1-based |
| `signature` | string | Optional signature |
| `exported` | boolean | Public/exported/API surface hint |
| `doc_summary` | string | Cached summary, hash-keyed |

### EdgeRecord

| Field | Type | Notes |
|---|---|---|
| `from_symbol` | string | Source symbol id |
| `to_symbol` | string | Target symbol id |
| `relation` | enum | imports, calls, implements, route_to, emits, consumes, reads_table, writes_table, tests |
| `confidence` | number | 0-1 |
| `source` | string | parser, lsp, scip, test-runner, manual-doc |

### SearchResult

| Field | Type | Notes |
|---|---|---|
| `file` | string | Repo-relative path |
| `symbol` | string | Optional symbol display name |
| `symbol_id` | string | Optional stable id |
| `lines` | string | Compact range like `42-118` |
| `snippet` | string | Clipped snippet |
| `why_relevant` | string | Human-readable reason |
| `confidence` | number | 0-1 |
| `scores` | object | exact, semantic, graph, domain, test, recency |

### DomainRule

| Field | Type | Notes |
|---|---|---|
| `domain` | string | e.g. payment, order |
| `entity_or_flow` | string | Optional narrower key |
| `invariant` | string | Compact business rule |
| `source_path` | string | File or doc backing the rule |
| `confidence` | number | 0-1 |

### TestTarget

| Field | Type | Notes |
|---|---|---|
| `test_id` | string | Stable test id |
| `file` | string | Test file |
| `command` | string | Targeted command |
| `covers_symbols` | string[] | Related symbol ids |
| `avg_runtime_ms` | integer | Optional |
| `flaky_score` | number | 0-1 |

### ContextPacket

| Field | Type | Notes |
|---|---|---|
| `task` | object | Summary, domain, intent, assumptions |
| `budget` | object | Estimated tokens, max tokens, omitted counts |
| `domain_rules` | DomainRule[] | Compact invariants |
| `candidate_files` | SearchResult[] | Metadata and reasons |
| `editable_snippets` | SearchResult[] | Small ranges only |
| `related_contracts` | SearchResult[] | Types, schemas, APIs, events |
| `related_tests` | TestTarget[] | Test files and commands |
| `validation` | object[] | Commands and expected signal |
| `next_actions` | string[] | Suggested detail calls if context is insufficient |

## Invariants

1. No tool returns full files by default.
2. Every code result has a path and line range.
3. Every clipped result reports omissions.
4. Generated/vendor files are excluded or penalized unless explicitly requested.
5. Summary cache keys include the git blob hash and symbol range hash.
6. Context packets must be reproducible from index state plus task input.
7. Confidence gaps are explicit; missing business rules are not invented.
