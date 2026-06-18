---
description: "Run a /goal-driven TDD engineering loop with bounded context, traces, evals, feedback, and a ranked Codex handoff."
---

# /goal-tdd-engineer-loop

Use this prompt when an active `/goal` should be implemented through strict TDD and an improvement-loop artifact trail.

## Arguments

- `${input:goal}` - active goal text, goal id, issue, spec path, or plain requirement.
- `${input:scope}` - optional module, file, issue, or failing test anchor.
- `${input:maxIterations}` - optional TDD iteration cap. Default: use repo config or `6`.

## Instructions

Invoke the `goal-tdd-engineer-loop` skill.

Run the loop in this order:

1. Confirm the task starts from trunk (`main`, `master`, or configured trunk), then name the task branch and intended small commit boundary.
2. Normalize `${input:goal}` into acceptance criteria, non-goals, constraints, verification commands, and context budget.
3. Build the smallest useful `context-packet.md`; do not broad-scan when `${input:scope}` narrows the task.
4. Create or identify RED tests and record the AC-to-test map in `test-coverage.md`.
5. Use `tdd-implement-loop` for production-code edits only.
6. Run targeted green verification and scoped regression from `goal-eval-plan.md`; every acceptance criterion needs coverage evidence or an explicit verification gap.
7. Capture feedback, convert feedback into eval rows, run `git status --short`, and write `codex_handoff.md` with ranked next changes, commit-boundary notes, and rerun commands.

Stop on missing testable acceptance criteria, missing RED evidence, context budget overflow, TDD invariant violations, or failed evals without a ranked next step.
