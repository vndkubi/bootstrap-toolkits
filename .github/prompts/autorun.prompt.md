---
description: "Run a scoped feature end-to-end through 7 phases: INTAKE → CONTRACT → TEST-FIRST → FIXTURE → IMPLEMENT (TDD) → REVIEW → EVIDENCE. Emits a JSONL trace and validated confirmation gates; harness-parity across VS Code and Copilot CLI."
---

# /autorun

Execute an autonomous loop for a single PBI. You are operating as `@dev-orchestrator` inside this prompt.

> **CLI parity**: Copilot CLI does not dispatch `.prompt.md` files. CLI users invoke the mirror skill [`skills/autorun/SKILL.md`](../skills/autorun/SKILL.md) as `/autorun <ref> [flags]`. Both surfaces share the same state machine, gate schema, and exit codes.

## Arguments

- `${input:ref}` — PBI reference (GitHub `#N`, Jira `ABC-123`, `specs/<id>-<slug>`, or freetext). Required.
- Flags (CLI syntax — see [contracts/autorun-cli.md](../../specs/008-prove-by-api-flow/contracts/autorun-cli.md)):
  `--resume <token>`, `--answer <text>`, `--abort`, `--revert`, `--from-phase <N>`, `--skip-quickstart`.

## Governance

All work complies with `.github/constitution.md` including **Article X — Evidence over Mocks** (when ratified; see T-C1).

## Harness Detection

- If `process.env.COPILOT_HARNESS === "cli"` → render output as NDJSON on stdout (kinds: `status`, `gate`, `result`).
- Otherwise → render output as agent chat with confirmation UI.
- **Business logic is identical** across harnesses.

## State File

Session state lives at `.artifacts/<pbi>/session.json`. Resume token file (Fallback A): `.github/.traces/autorun-<pbi>.resume.json`.

## Trace

Append-only JSONL at `.github/.traces/autorun-<pbi>.jsonl`. First line = MetaRecord, rest = EventRecord. Validate every line against `.github/schemas/trace.schema.json` **before** writing. Redact through `redact-sensitive-data` first.

## Gate Emission

Every pause emits a gate object validated against `.github/schemas/gate.schema.json`. Invalid gates → self-gate `config-unknown-key` (dogfood). Never author ad-hoc natural-language pauses.

## 7-Phase State Machine

### Phase 0 — Preflight (no gate unless preflight fails)

1. Call `resolve-pbi-ref` with `${input:ref}`.
2. Call `sanitize-untrusted-input` on the returned body.
3. Call `autorun-branch.create(pbi)`.
4. Load + validate `.github/autorun.config.json`; unknown keys → gate `config-unknown-key`.
5. If harness = `cli`: require `.github/autorun.allowlist` exists → else gate `authz-no-allowlist` (exit 30).
6. Write MetaRecord to trace.

### Phase 1 — INTAKE

- If spec absent: invoke `specify-feature` skill; output `specs/<id>-<slug>/spec.md`.
- If spec exists: load and verify acceptance criteria are testable.
- Gate (business) `pbi-ambiguous` on AC conflicts.
- Commit via `autorun-branch.commitPhase(1, "intake")`.

### Phase 2 — CONTRACT

1. **Classify taxonomy.** Signals, weighted:
   - REST-ish paths (`GET /…`, `POST /…`) in spec → `api-rest`.
   - SDL types, `query {`, `mutation {` → `api-graphql`.
   - `service X { rpc … }`, `.proto` mention → `api-grpc`.
   - Kafka / RabbitMQ / SNS / SQS / CloudEvents / "topic" / "event" → `event-driven`.
   - Only CLI flags / stdout contract, no HTTP surface → `cli`.
   - Only UI screens / components, no backend surface → `ui-only`.
   - Purely functional API, no network surface → `library`.
   - Two or more of the above → `mixed`.
2. Confidence score = (top signal weight) / (sum of signal weights). Below 0.6 → gate `taxonomy-ambiguous` (category `taxonomy`, options = top-2 candidates + `"mixed"`).
3. For API-bearing taxonomies (`api-rest | api-graphql | api-grpc | event-driven | mixed`): invoke `generate-api-contract` skill → write `specs/<id>-<slug>/contracts/<protocol>.{yaml|proto|graphql}`. Empty `contracts/` for an API-bearing taxonomy → gate `contract-invalid` (category `config`, blocking).
4. For `library | cli | ui-only`: record decision + rationale in trace + append to `plan.md` §Supporting Artifacts; skip contract emission.
5. Invoke `run-local-stack` for healthcheck unless `--skip-quickstart` → failure → gate `quickstart-healthcheck-failed`.
6. Commit via `autorun-branch.commitPhase(2, "contract")`.

### Phase 3 — TEST-FIRST

- Route to `@api-test-author` agent with contract + ACs.
- Require failing tests mapped 1-1 to ACs; verify red before continuing.
- Commit.

### Phase 4 — FIXTURE

- Route to `@mock-data-specialist` for fixtures + DB seeds (Article X: **external** mocks only).
- Run PII scan on any generated stubs via `redact-sensitive-data`.
- Commit.

### Phase 5 — IMPLEMENT (TDD loop)

- Route to stack implementor; drive `tdd-implement-loop` skill.
- Bounds: `config.tddLoop.maxIterations`; `noProgressThreshold` hits → gate `no-progress-halt`.
- Regression scope: `impact-analysis` output if available, else full.
- If `config.hooks.postEditRunTests=true`: hook runs scoped tests between edits on branch `autorun/*` only.
- Track `tokenCost` running sum; at 90% of `cost.tokenCap` emit non-blocking `cost-cap-approaching`; past cap exit 40.
- Commit after loop converges green.

### Phase 6 — REVIEW

- Invoke `review-code-changes` with `--evidence-bundle .artifacts/<pbi>/`.
- Pipeline: functional → technical (→ mobile if detected).
- `@functional-reviewer` returns `{verdict, findings[], articleXCompliant}`.
- `articleXCompliant=false` without ratified `.artifacts/<pbi>/mock-exceptions.md` → exit 31.
- Blocker finding → gate `review-blocker` (category business).
- Commit.

### Phase 7 — EVIDENCE

- Invoke `generate-evidence-summary` skill. Produces committed `specs/<id>-<slug>/evidence-summary.md` + local bundle at `.artifacts/<pbi>/` (trace, test-coverage, tdd-log, mocks-used, review-report.json, test-results/).
- `evidence-incomplete` / `trace-invalid` / `review-report-invalid` / `artifact-leak-risk` gates → halt (blocking).
- Route to `@pr-manager` **with** `--evidence-bundle .artifacts/<pbi>/`. PR body is rendered from `templates/pr-body.autorun.md`.
- `articleXCompliant=false` without ratified `mock-exceptions.md` → `@pr-manager` opens draft PR + exit 31.
- Otherwise emit terminal `result` record; exit 0.

## Flags — Lifecycle Operations

- `--abort`: call `autorun-branch.abort(pbi)`; emit trace `action: "abort"`; exit 0.
- `--revert`: call `autorun-branch.revert(pbi)`; exit 0.
- `--resume <token>`: read `.github/.traces/autorun-<pbi>.resume.json`; verify token; re-enter at the recorded phase.
- `--from-phase N`: soft-reset to phase N (Should-Have; rewrites nothing beyond the phase-N commit).

## Exit Codes

Per [contracts/autorun-cli.md](../../specs/008-prove-by-api-flow/contracts/autorun-cli.md): 0 ok · 1 error · 2 bad args · 10+N gate · 20+N failure · 30 authz · 31 Article X · 40 cost cap.

## Rules (invariants)

1. Never edit files outside the `autorun/<pbi>` branch.
2. Never embed unsanitized external text into downstream prompts.
3. Never write to trace without redacting first.
4. Never emit an unvalidated gate.
5. Never bypass a blocking gate programmatically — only via resume + answer.
6. Business logic, redaction policy, and gate schema are identical across harnesses.

## Verification

Schema validation and CLI smoke matrix run in CI. Locally, dry-run against a toy PBI should walk Phases 0–7 as no-ops on branch `autorun/toy-1`.
