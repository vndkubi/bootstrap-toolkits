# `/autorun` CLI Contract

> Part of specs/008-prove-by-api-flow/contracts/
> This document is the **authoritative UX + protocol spec** for `/autorun` across both harnesses. Changes here must flow back into [spec.md](../spec.md) §8 and the orchestrator prompt.

## Invocation

```
/autorun <pbi-ref> [--resume <token>] [--abort] [--revert] [--from-phase N]
                   [--skip-quickstart] [--config <path>]
```

### Argument resolution

| Arg | Form | Effect |
|---|---|---|
| `<pbi-ref>` | Path `specs/<id>-<slug>` | Reuse existing workspace |
| `<pbi-ref>` | `#123`, `gh-123` | Fetch GitHub issue body |
| `<pbi-ref>` | `PROJ-123` | Fetch Jira issue body |
| `<pbi-ref>` | free text | Slugify, treat as description |

Precedence is governed by `autorun.config.json → pbi.resolver.order`.

### Flags

| Flag | Required when | Effect |
|---|---|---|
| `--resume <token>` | Session is `gated` | Continue from the gate; token must match session's current |
| `--abort` | Any time | Reset working tree to branch base, keep branch for inspection |
| `--revert` | Post-completion | Delete the `autorun/<pbi>` branch, mark spec `status: reverted` |
| `--from-phase N` | Replay scenario | Re-enter at phase N on an existing `autorun/<pbi>` branch |
| `--skip-quickstart` | Local stack unavailable | Records explicit assumption, downgrades evidence quality |
| `--config <path>` | Override default | Use an alternate `autorun.config.json` |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Session completed successfully |
| 1 | Unexpected error (bug, crash, uncaught exception) |
| 2 | Invalid CLI input |
| 11-17 | Phase 1-7 emitted a confirmation gate (see [gate.schema.json](./gate.schema.json)) |
| 21-27 | Phase 1-7 failed hard (contract invalid, tests red past budget, …) |
| 30 | AuthZ denied (missing allowlist or hook permission) |
| 31 | Article X violation without ratified ADR |
| 40 | Cost cap hit |

## Stdout protocol (CLI harness)

The CLI harness emits **line-delimited JSON** records, one per line, mixed from three kinds.

### 1. Status record (informational)

```json
{"kind":"status","phase":2,"message":"Generating OpenAPI contract","ts":"2026-04-24T10:13:22Z"}
```

### 2. Gate record (pause point; process exits with 10+N immediately after)

Conforms to [gate.schema.json](./gate.schema.json). Example:

```json
{"kind":"gate","schemaVersion":"1","phase":2,"gateId":"taxonomy-ambiguous","question":"Spec mentions both REST endpoints and Kafka events. Choose primary taxonomy.","options":["api-rest","event-driven","mixed"],"default":null,"blocking":true,"resumeToken":"8xK3p…","category":"taxonomy"}
```

### 3. Result record (end of run)

```json
{"kind":"result","outcome":"completed","pbi":"PBI-123","branch":"autorun/PBI-123","artifacts":{"summary":"specs/123-.../evidence-summary.md","trace":".github/.traces/autorun-PBI-123.jsonl"}}
```

`outcome ∈ {completed, aborted, gated, failed}`.

## VS Code harness rendering

- `status` records → inline progress lines in chat.
- `gate` records → QuickPick (if `options`) + free-text input fallback.
- `result` records → markdown summary with clickable links.
- Gate answers are submitted back to the orchestrator via the normal chat turn; no resume token handling is user-visible.

## Resume flow (CLI)

```
$ /autorun PBI-123
... status ...
{"kind":"gate",...,"resumeToken":"8xK3p..."}
$ echo $?
12

# Operator reviews, decides, invokes:
$ /autorun PBI-123 --resume 8xK3p... --answer "api-rest"
... resumes at Phase 2 ...
```

Resume tokens are also persisted to `.github/.traces/autorun-<PBI>.resume.json` so CI can replay without shell-state dependence.

## Contract tests

Every release MUST include CI tests that verify:

1. Valid CLI invocations → correct exit codes.
2. Every `kind:"gate"` line validates against `gate.schema.json`.
3. Every `kind:"event"` line in the trace file validates against `trace.schema.json`.
4. A session interrupted at each of phases 1-7 can be resumed to completion.
5. `--abort` leaves `git status` clean on the branch base.

## Registered gate ids (initial set)

| gateId | Phase | Category | Blocking |
|---|---|---|---|
| `pbi-ambiguous` | 1 | business | yes |
| `injection-suspected` | 1 | security | yes |
| `authz-shell-exec` | 5 | authz | yes |
| `authz-no-allowlist` | 0 | authz | yes |
| `taxonomy-ambiguous` | 2 | taxonomy | yes |
| `contract-invalid` | 2 | business | yes |
| `quickstart-healthcheck-failed` | 2 | business | yes |
| `no-progress-halt` | 5 | business | yes |
| `article-x-violation` | 6 | business | yes |
| `cost-cap-approaching` | * | config | no |
| `config-unknown-key` | 0 | config | yes |

New gates MUST be added to this table and to `contracts/autorun-gates.md` (if expanded).
