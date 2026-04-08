---
name: implement-feature
description: "Executes an approved spec-driven implementation using the feature workspace artifacts and the repo's actual stack. Uses the reviewed spec, plan, tasks, contracts, and verification commands to drive safe implementation instead of relying on stack-specific defaults."
---

# Implement Feature

Use this skill after specification, planning, and task generation are complete enough to begin coding.

## When to Use

- A feature workspace already exists under `specs/`
- `spec.md`, `plan.md`, and `tasks.md` are reviewed enough to execute
- The user wants implementation to follow approved tasks rather than ad hoc coding

If those prerequisites are missing on a large or business-heavy repo, do not treat this skill as a substitute for orchestration. Return to `@dev-orchestrator` or the spec pipeline first.

## Prerequisites

- `spec.md`
- `plan.md`
- `tasks.md`
- supporting artifacts when present:
  - `research.md`
  - `data-model.md`
  - `contracts/`
  - `quickstart.md`
- repo verification commands from docs or project files

## Large-Repo Entry Guard

Before implementation starts, verify:

- [ ] the work is either backed by a reviewed feature workspace or narrow enough to remain local
- [ ] acceptance criteria are explicit
- [ ] affected module boundary is known
- [ ] there are fewer than 3 unresolved critical unknowns

If any check fails, stop and route the work back to `@dev-orchestrator`, `/specify-feature`, or `/plan-implementation` instead of filling the gaps during coding.

## Core Rule

Implementation must serve the approved specification and implementation plan.

- Do not invent behavior outside the approved scope.
- Do not override the spec with convenience shortcuts.
- If code reality conflicts with the approved spec, stop and surface the mismatch.

## Workflow

### Step 0: Context Prewarming

Before reading the feature workspace, load available repo context:

1. Prefer generated repo context docs when present: `docs/00-repo-overview.md`, `docs/02-architecture-map.md`, `docs/04-engineering-rules.md`, and relevant module docs.
2. If those docs do not exist yet, read the target repo's own README, build files, source tree, tests, CI configs, and relevant `.github/docs/*.md` bundle guidance instead.
3. Extract patterns and conventions relevant to this feature's module(s).

Use this context to validate implementation choices against actual repo conventions.

### Step 1: Re-read The Feature Workspace

Before editing code:

- read `spec.md`
- read `plan.md`
- read `tasks.md`
- load supporting artifacts relevant to the current task

### Step 2: Re-run Phase -1 Gates

Check the current change slice against [Project Constitution](../../constitution.md):

- simplicity
- duplication
- business logic
- impact

If the approved plan no longer passes these gates because of newly discovered code reality, stop and update the plan first.

### Step 3: Execute Tasks In Order

Implement the current task set according to:

- task dependencies
- stack conventions already used in the repo
- contracts and data model definitions from the feature workspace
- verification checkpoints from the plan

Prefer stack-specific implementor agents or repo patterns for the actual code changes. Do not hardcode Maven, Java, or any other stack default unless the repo evidence requires it.

### Step 3.5: Self-Evaluation Checkpoint

Before running tests, evaluate the implementation:

- **Completeness** (1-10): Are all tasks in the current slice implemented?
- **Evidence quality** (1-10): Does every change trace to an approved task or spec requirement?
- **Risk coverage** (1-10): Are edge cases, error paths, and cross-module impacts handled?

If any score < 7: identify the gap and address it before continuing to Step 4.
If 3+ scores < 7: STOP and present gaps to the user for guidance.

### Step 4: Test And Verify

Use the repo's actual verification commands from:

- `docs/03-verification-runbook.md`
- package/build files
- CI configs
- the approved plan

At each checkpoint:

- run the scoped verification that the plan requires
- stop if verification fails
- fix before moving to dependent tasks

### Step 5: Report Drift

If implementation reveals a mismatch between spec, plan, and code:

- label it as drift
- name the affected requirement, task, or contract
- decide whether to patch the spec, patch the plan, or narrow the implementation

Do not quietly change behavior without updating the spec artifacts.

## Validation

- [ ] Code changes align with approved tasks
- [ ] Verification commands match the real repo, not stack defaults
- [ ] Contracts and model artifacts were respected
- [ ] Phase -1 gates still pass for the implemented slice
- [ ] Drift between spec and code was surfaced explicitly
