---
name: goal-tdd-engineer-loop
description: "Runs a /goal-driven engineering loop that converts an active goal into acceptance criteria, context budget, red tests, TDD implementation, eval evidence, feedback, and a ranked Codex handoff. Keywords: goal loop, TDD, red green, evals, traces, feedback, Codex handoff, token budget."
---

# Goal TDD Engineer Loop

Use this skill when the user is working from a persistent `/goal` and wants the agent to engineer with strict TDD while keeping context and token usage bounded.

This loop adapts the OpenAI cookbook pattern of traces -> feedback -> evals -> ranked harness changes -> Codex handoff into a local repository workflow. It does not require the OpenAI API at runtime; the required artifacts are plain files in the repo or local `.artifacts/` folder.

## When to Use

- The user says `/goal`, "use TDD", "engineering loop", "improvement loop", "agent improvement loop", or "goal-driven implementation".
- A task needs repeated implementation/evaluation cycles instead of a one-shot code edit.
- A previous run produced feedback that should be converted into tests or harness changes.
- The work is large enough to need durable trace/eval artifacts, but not so vague that implementation can start without acceptance criteria.

Do not use this for docs-only changes, trivial one-file fixes, or exploratory research with no acceptance criteria.

## Inputs

- Active goal text or explicit goal statement.
- Repo evidence anchors: issue, spec, failing behavior, test file, prompt, or user-provided requirement.
- Optional prior artifacts:
  - `goal-trace.jsonl`
  - `goal-feedback.md`
  - `goal-eval-plan.md`
  - `codex_handoff.md`
  - `specs/<id>-<slug>/test-coverage.md`
  - `specs/<id>-<slug>/tdd-log.md`

## Outputs

Write under `specs/<id>-<slug>/` when a feature workspace exists. Otherwise use local `.artifacts/<goal-slug>/` run artifacts.

- `goal-brief.md`: normalized goal, assumptions, non-goals, acceptance criteria, and verification commands.
- `context-packet.md`: the minimal source/doc/test anchors required for the next step.
- `goal-trace.jsonl`: append-only run events with phase, action, inputs, outputs, commands, and result.
- `test-coverage.md`: acceptance-criteria-to-test map.
- `tdd-log.md`: red->green implementation iterations.
- `goal-eval-plan.md`: eval cases or commands that decide whether the goal is met.
- `goal-feedback.md`: human, model, review, or test feedback captured after each run.
- `codex_handoff.md`: diagnosis, ranked next changes, evidence, exact files/tests, and rerun command.

## Token And Context Rules

1. Build `context-packet.md` before broad reading. Include only source anchors needed for the next phase.
2. Do not do a whole-repo scan when an issue, spec, file path, or failing test already narrows the task.
3. Before production edits, limit discovery to the smallest useful slice: normally no more than 8 search/read commands and 2 full-file reads.
4. For exact bug or test failures, bypass heavy spec generation unless acceptance criteria are missing or the blast radius is unclear.
5. Prefer generated repo maps, MCP `analyze_repo`, MCP `audit_context`, or existing docs over repeated manual inventory.
6. Stop and ask for clarification when the goal has 3 or more critical unknowns after bounded investigation.

## Trunk And Commit Discipline

1. Start from the repo trunk branch (`main`, `master`, or the configured trunk) before opening the task branch.
2. Keep the task slice small enough for one reviewable commit unless the goal explicitly calls for a larger staged plan.
3. Do not mix bootstrap/config cleanup with product-code changes in the same commit.
4. Record the intended commit boundary in `goal-brief.md`.
5. Record coverage evidence in `test-coverage.md`: every acceptance criterion must map to a RED command, GREEN command, scoped regression command, or an explicit verification gap.
6. Before handoff, run `git status --short` and summarize uncommitted files so the next agent can keep the commit small.

## Workflow

### Phase 0: Goal Intake

1. Read the active `/goal` objective or explicit request.
2. Normalize it into `goal-brief.md`:
   - goal
   - acceptance criteria
   - non-goals
   - constraints
   - trunk branch and current task branch
   - intended commit boundary
   - likely files/modules
   - verification commands
   - token/context budget
3. If acceptance criteria are not testable, stop with `goal-ambiguous` and ask for the missing information.
4. Append a `goal-intake` event to `goal-trace.jsonl`.

### Phase 1: Context Packet

1. Load only the minimal anchors needed to design tests.
2. Record loaded files and why they were needed in `context-packet.md`.
3. Run or simulate `audit_context` when available. Keep the first packet under 40 KB unless the user approves a larger packet.
4. Append a `context-packet` event to trace with file count and estimated size.

### Phase 2: Red Tests

1. Convert every acceptance criterion into at least one test row in `test-coverage.md`.
2. Author or identify the smallest failing test command for the first behavior slice.
3. Run the targeted command and capture expected RED evidence.
4. Do not edit production code before RED evidence exists unless the user explicitly approves a test-first exception.
5. Append a `red-test` event to trace.

### Phase 3: TDD Implementation

1. Invoke `tdd-implement-loop`.
2. Edit production code only while the loop is active.
3. Keep tests fixed as the target; suspected test bugs emit `tdd-test-bug-suspected`.
4. After each iteration, update `tdd-log.md` and append a `tdd-iteration` event.
5. Stop on `tdd-no-progress`, `tdd-test-edited`, `tdd-test-skipped`, or cost/context cap gates.

### Phase 4: Eval Gate

1. Run the targeted green command.
2. Run scoped regression commands from `goal-eval-plan.md`.
3. Confirm every acceptance criterion has coverage evidence or an explicit verification gap.
4. Score the result as `pass`, `partial`, or `fail` with evidence links.
5. Convert uncovered feedback into new eval rows before changing the harness or implementation.
6. Append an `eval-result` event to trace.

### Phase 5: Feedback And Improvement Ranking

1. Capture feedback in `goal-feedback.md`.
2. Classify each item as:
   - requirement gap
   - missing test
   - implementation bug
   - harness/prompt issue
   - context routing issue
   - cost or token issue
3. Rank next changes by expected impact, evidence strength, and implementation cost.
4. Write `codex_handoff.md` with:
   - current diagnosis
   - ranked recommendations
   - evidence from trace/evals/feedback
   - exact files to inspect or change
   - commands to rerun
   - stop condition for the next run
5. Append an `improvement-handoff` event to trace.

## Loop Stop Rules

Stop and report the gate instead of continuing when:

- `goal-ambiguous`: acceptance criteria are missing or not testable.
- `context-cap-exceeded`: the needed context exceeds the approved packet budget.
- `red-evidence-missing`: no failing test or approved exception exists before implementation.
- `tdd-test-edited`: tests changed during the production-code-only loop.
- `tdd-test-skipped`: a new skip/disable marker appeared.
- `tdd-no-progress`: no test progress after the configured threshold.
- `eval-regression`: scoped regression fails after targeted green.
- `handoff-incomplete`: `codex_handoff.md` lacks evidence, ranked changes, or rerun commands.

## Verification Contract

- Expected Outcome: the goal has testable acceptance criteria, RED evidence, GREEN evidence, scoped regression or explicit verification gap, and a ranked handoff for the next improvement pass.
- How to Verify: check that `goal-trace.jsonl`, `test-coverage.md`, `tdd-log.md`, `goal-eval-plan.md`, `goal-feedback.md`, and `codex_handoff.md` exist or have explicit skip reasons.
- When to Stop or Escalate: stop when the goal cannot be made testable, the context budget is exceeded, TDD invariants are violated, or evals fail without a clear next ranked change.
