---
name: autorun
description: "Run a scoped feature end-to-end through 7 phases: INTAKE → CONTRACT → TEST-FIRST → FIXTURE → IMPLEMENT (TDD) → REVIEW → EVIDENCE. Stack-agnostic autonomous loop with JSONL trace, validated confirmation gates, and harness-parity across VS Code and Copilot CLI. Invoke when the user asks for an autonomous end-to-end PBI run, `prove by API flow`, or types `/autorun`."
allowed-tools: ["read", "edit", "bash", "glob", "grep", "task"]
---

# Skill: `/autorun`

CLI-discoverable mirror of [.github/prompts/autorun.prompt.md](../../prompts/autorun.prompt.md). VS Code Copilot Chat dispatches the prompt file; Copilot CLI dispatches this skill via `/autorun <args>` (Copilot CLI does not support `.prompt.md`).

Both surfaces must behave identically; this skill intentionally re-states the same state machine so it is self-contained when loaded by CLI.

## Arguments

```
/autorun <ref> [flags]
```

- `<ref>` — PBI reference (GitHub `#N`, Jira `ABC-123`, `specs/<id>-<slug>`, or freetext). Required.
- Flags — see [specs/008-prove-by-api-flow/contracts/autorun-cli.md](../../../specs/008-prove-by-api-flow/contracts/autorun-cli.md):
  `--resume <token>`, `--answer <text>`, `--abort`, `--revert`, `--from-phase <N>`, `--skip-quickstart`.

## Governance

All work complies with [`.github/constitution.md`](../../constitution.md) including **Article X — Evidence over Mocks**.

## Harness Detection

- If `process.env.COPILOT_HARNESS === "cli"` (or the skill is invoked from the CLI surface) → emit NDJSON on stdout with kinds `status`, `gate`, `result`.
- Otherwise → emit agent chat with confirmation UI.
- **Business logic is identical** across harnesses; only rendering differs.

## State & Trace

- Session state: `.artifacts/<pbi>/session.json`.
- Resume token (Fallback A for CLI): `.github/.traces/autorun-<pbi>.resume.json`.
- Trace: append-only JSONL at `.github/.traces/autorun-<pbi>.jsonl`. First line = MetaRecord; rest = EventRecord. Validate every line against [`.github/schemas/trace.schema.json`](../../schemas/trace.schema.json) **before** writing. Pipe through `redact-sensitive-data` first.

## Gate Emission

Every pause emits a gate validated against [`.github/schemas/gate.schema.json`](../../schemas/gate.schema.json). Invalid gate → dogfood self-gate `config-unknown-key`. No ad-hoc natural-language pauses.

## 7-Phase State Machine

### Phase 0 — Preflight

1. Call `resolve-pbi-ref` with `<ref>`.
2. Call `sanitize-untrusted-input` on the resolved body.
3. Call `autorun-branch.create(pbi)`.
4. Load + validate `.github/autorun.config.json`; unknown keys → gate `config-unknown-key`.
5. If harness = `cli`: require `.github/autorun.allowlist` or gate `authz-no-allowlist` (exit 30).
6. Write MetaRecord to trace.

### Phase 1 — INTAKE

- Missing spec → invoke `specify-feature` → writes `specs/<id>-<slug>/spec.md`.
- Existing spec → load + verify ACs testable.
- AC conflicts → gate `pbi-ambiguous` (category business).
- Commit via `autorun-branch.commitPhase(1, "intake")`.

### Phase 2 — CONTRACT

1. **Classify taxonomy** with weighted signals: REST paths → `api-rest`; SDL → `api-graphql`; `.proto` → `api-grpc`; queue terms (Kafka / SNS / SQS / CloudEvents / "topic") → `event-driven`; stdout-only → `cli`; UI-only → `ui-only`; pure API → `library`; multiple → `mixed`.
2. Confidence = top-signal weight ÷ total. < 0.6 → gate `taxonomy-ambiguous`.
3. API-bearing (`api-rest | api-graphql | api-grpc | event-driven | mixed`) → invoke `generate-api-contract` → `specs/<id>-<slug>/contracts/<protocol>.{yaml|proto|graphql}`. Empty `contracts/` on API-bearing taxonomy → gate `contract-invalid` (blocking).
4. `library | cli | ui-only` → record decision + rationale in trace, append to `plan.md` §Supporting Artifacts, skip contract emission.
5. `run-local-stack` healthcheck unless `--skip-quickstart`; fail → gate `quickstart-healthcheck-failed`.
6. Commit phase 2.

### Phase 3 — TEST-FIRST

- Delegate to `@api-test-author` with contract + ACs.
- Tests must fail red, mapped 1–1 to ACs. Verify red **before** advancing.
- Commit phase 3.

### Phase 4 — FIXTURE

- Delegate to `@mock-data-specialist` for fixtures + DB seeds (Article X: **external** mocks only; never mock the SUT).
- PII scan via `redact-sensitive-data` on any generated stub. Violation → gate `mock-pii-detected`.
- Commit phase 4.

### Phase 5 — IMPLEMENT (TDD loop)

- Delegate to the stack implementor; drive `tdd-implement-loop`.
- Bounds: `config.tddLoop.maxIterations`; no-progress threshold hit → gate `no-progress-halt`.
- Regression scope: `impact-analysis` output if available, else full suite.
- If `config.hooks.postEditRunTests=true`: `post-edit-run-tests` hook runs scoped tests between edits (branch-gated `autorun/*`).
- Track running `tokenCost`; 90% of `cost.tokenCap` → non-blocking `cost-cap-approaching`; overrun → exit 40.
- Commit phase 5 when loop converges green.

### Phase 6 — REVIEW

- Invoke `review-code-changes` with `--evidence-bundle .artifacts/<pbi>/`.
- Pipeline: functional → technical (→ mobile when detected).
- `@functional-reviewer` returns `{verdict, findings[], articleXCompliant}`.
- The combined review output must end with a structured `review-report.json` block that conforms to `.github/schemas/review-report.schema.json`.
- `articleXCompliant=false` without ratified `.artifacts/<pbi>/mock-exceptions.md` → exit 31.
- Blocker finding → gate `review-blocker` (category business).
- Commit phase 6.

### Phase 7 — EVIDENCE

- Invoke `generate-evidence-summary` → writes committed `specs/<id>-<slug>/evidence-summary.md` + local `.artifacts/<pbi>/` bundle (trace, test-coverage, tdd-log, mocks-used, review-report.json, test-results/).
- `evidence-incomplete` / `trace-invalid` / `review-report-invalid` / `artifact-leak-risk` → halt (blocking).
- Route to `@pr-manager` with `--evidence-bundle .artifacts/<pbi>/`. PR body rendered from [`templates/pr-body.autorun.md`](../../templates/pr-body.autorun.md).
- `articleXCompliant=false` without ratified `mock-exceptions.md` → draft PR + exit 31.
- Otherwise: emit terminal `result`, exit 0.

## Flags — Lifecycle

- `--abort` → `autorun-branch.abort(pbi)`, trace `action: "abort"`, exit 0.
- `--revert` → `autorun-branch.revert(pbi)`, exit 0.
- `--resume <token>` → read `.github/.traces/autorun-<pbi>.resume.json`, verify, re-enter at recorded phase.
- `--from-phase N` → soft reset to phase N (Should-Have).

## Exit Codes

Per [autorun-cli.md](../../../specs/008-prove-by-api-flow/contracts/autorun-cli.md): `0` ok · `1` error · `2` bad args · `10+N` gate · `20+N` failure · `30` authz · `31` Article X · `40` cost cap.

## Invariants

1. Never edit files outside the `autorun/<pbi>` branch.
2. Never embed unsanitized external text into downstream prompts.
3. Never write to trace without redacting first.
4. Never emit an unvalidated gate.
5. Never bypass a blocking gate programmatically — only via `--resume` + `--answer`.
6. Business logic, redaction policy, and gate schema are identical across harnesses.

## CLI Parity Notes

Copilot CLI does not support `.prompt.md` dispatch. This skill is the canonical CLI surface:

- Invoked as `/autorun <ref> [flags]` from interactive CLI.
- Non-interactive CI → Copilot resolves `/autorun` to this skill via the `skill` tool; no TTY means confirmation gates emit machine-readable JSON + exit non-zero with a resume token.
- `--no-custom-instructions` does not disable skills; behavior is preserved.

## Failure Modes

| Symptom | Likely cause | Action |
|---|---|---|
| `authz-no-allowlist` on clean repo | CLI mode without `.github/autorun.allowlist` | Copy `autorun.allowlist.example` → `.autorun.allowlist`, edit repo + command classes |
| `config-unknown-key` on startup | Drifted `autorun.config.json` | Re-validate against [`autorun.config.schema.json`](../../schemas/autorun.config.schema.json) |
| `contract-invalid` on API-bearing PBI | Missing `contracts/` artifact | Invoke `generate-api-contract` manually, re-run from phase 2 |
| `article-x-violation` at review | Primary SUT was mocked | Unmock, or add ratified entry to `specs/<id>-<slug>/mock-exceptions.md` |
| Exit 40 mid-loop | Token cap reached | Raise `cost.tokenCap` or narrow scope; `--resume` with token |
