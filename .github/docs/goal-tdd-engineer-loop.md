# Goal TDD Engineer Loop

Use this loop when a persistent `/goal` needs implementation plus repeated evaluation, not just a single code edit.

## Shape

1. Confirm trunk base (`main`, `master`, or configured trunk), task branch, and intended small commit boundary.
2. Normalize the goal into `goal-brief.md`.
3. Build a bounded `context-packet.md`.
4. Map acceptance criteria to RED tests in `test-coverage.md`.
5. Run production-code-only TDD through `tdd-implement-loop`.
6. Run targeted and scoped regression evals from `goal-eval-plan.md`.
7. Capture feedback in `goal-feedback.md`.
8. Write `codex_handoff.md` with ranked next changes, evidence, files, tests, commit-boundary notes, and rerun commands.

## Token Saving Rules

- Start from issue/spec/file/test anchors before searching.
- Cap the first context packet at 40 KB unless the user approves more.
- Prefer repo maps and MCP repo-intelligence tools over repeated manual inventory.
- Skip spec generation for exact failing-test or exact bug tasks when acceptance criteria are already testable.
- Stop after bounded discovery if 3 or more critical unknowns remain.

## Required Evidence

- Trunk branch, task branch, and intended small commit boundary.
- RED command and expected failure reason.
- GREEN command after implementation.
- Coverage evidence mapping every acceptance criterion to test or verification evidence.
- Scoped regression or an explicit verification gap.
- Trace events in `goal-trace.jsonl`.
- Ranked next-step handoff in `codex_handoff.md`.
