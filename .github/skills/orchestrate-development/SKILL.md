---
name: orchestrate-development
description: "Scoped end-to-end development workflow: investigate, confirm, implement, test, verify, and document with evidence-backed reasoning. For larger or requirement-heavy work, hand off into the spec-kit workflow instead of forcing ad hoc implementation."
---

# Orchestrate Development

Use this skill when the user wants one workflow to carry a requirement from analysis through delivery.

## When to Use

- a well-bounded feature or bug fix
- a PBI that needs investigation plus implementation
- a request to implement, test, and document in one thread

For vague, high-risk, or multi-module features, prefer the spec-driven workflow before implementation:

- `specify-feature`
- `plan-implementation`
- `generate-tasks`
- `implement-feature`

## Core Principles

- Follow the [Project Constitution](../../constitution.md).
- Discovery comes before implementation.
- Business claims need evidence anchors or assumption labels.
- Verification is required when runnable commands exist.
- Large repos should be handled by domain or module, not all at once.
- Non-trivial work should use durable spec artifacts instead of chat-only intent.

## Workflow

### Step 1: Parse And Scope

- extract requirement, constraints, and acceptance criteria
- detect the stack from repo evidence
- identify affected modules
- decide whether the scope is small enough for a single workflow

Escalate to the spec-kit workflow when:

- business rules are still forming
- multiple modules or contracts are involved
- the change needs durable traceability
- more than 3 critical unknowns remain

### Step 2: Investigate

Trace the as-is flow and produce:

- current behavior
- business rules already enforced
- likely change points
- impact map
- risks and assumptions

Use file or doc anchors wherever possible.

### Step 3: Confirm

Before implementation, confirm:

- planned files or areas to change
- architectural direction
- assumptions
- verification approach
- whether the work stays in fast-path orchestration or should move into `specs/`

Wait for explicit confirmation.

### Step 4: Phase -1 Gates

Do not write code until these gates pass:

- Simplicity
- Duplication
- Business Logic
- Impact

### Step 5: Implement

Implement incrementally and explain key decisions:

- why a new file is needed
- why a pattern matches the repo
- why a validation belongs in a given layer
- why a shared-component change is safe

For changes touching 5+ files, verify in chunks instead of waiting until the end.

If the work was approved through a feature workspace, follow the approved `spec.md`, `plan.md`, and `tasks.md` rather than improvising.

### Step 6: Test

Testing goals:

- strong branch coverage on changed logic
- edge cases and regressions covered
- for Java API behavior, default to Outside-in API Component Testing - Real Core, Mock Boundaries
- minimal mocking: run owned internal components real and mock only system boundaries
- isolated test database for persistence behavior when practical
- direct domain unit tests for decision tables, state machines, pricing, tax, discount, date/time rules, and permission matrices
- business-scenario naming

Aim for 100% branch coverage on changed critical logic when practical. Do not promise 100% across the whole surface by default.

### Step 7: Verify

Run the repo's build, test, and lint/static-analysis commands when they:

- exist
- are relevant to the change
- are runnable in the current environment

If a command cannot run, report:

- the missing prerequisite
- the command that was skipped
- what risk remains because of that gap

### Step 8: Deliver

Produce a final markdown report with:

- summary of changes
- files touched
- business reasoning
- verification evidence
- assumptions and open risks
- suggested next step

## Stack Adaptation

Follow the repo's actual patterns and verification commands. Do not hardcode one stack's defaults when the repo evidence says otherwise.

## Validation Checklist

- existing flow traced before implementation
- business rules aligned or labeled as assumptions
- changed modules/files identified
- verification evidence captured, or missing verification stated explicitly
- spec-kit handoff was used when the scope justified it
- no false "done" language when verification is incomplete
