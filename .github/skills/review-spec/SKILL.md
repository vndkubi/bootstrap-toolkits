---
name: review-spec
description: "Review a feature specification and its spec-kit artifacts for completeness, ambiguity, security gaps, testability, and traceability. Evaluates the feature workspace as a whole, not just spec.md."
---

# Review Spec

Review specification artifacts before implementation begins. Catch ambiguity, missing contracts, weak validation scenarios, and traceability gaps while changes are still cheap.

## When to Use

- Before development starts on a new feature
- After `specify-feature` produces `spec.md`
- After `plan-implementation` adds `plan.md` and supporting artifacts
- After `update-spec` changes an existing feature workspace
- When the user asks whether a spec is ready

## Inputs

Review the feature workspace when available:

- `spec.md`
- `plan.md`
- `research.md`
- `data-model.md`
- `contracts/`
- `quickstart.md`

If only part of the workspace exists, review what is present and list what is still missing.

## Review Lenses

### 1. Completeness

Check:

- required PRD sections exist
- major requirements are traceable
- out-of-scope boundaries are explicit
- assumptions and open questions are visible
- supporting artifacts exist when the feature needs them

### 2. Security And Risk

Check:

- auth and authorization expectations are explicit when needed
- input validation and error handling expectations are defined
- sensitive data handling is addressed
- concurrency, idempotency, or state-guard concerns are surfaced
- operational or compliance risks are named where relevant

### 3. Testability

Check:

- acceptance criteria are precise enough to verify
- boundary and failure cases are explicit
- quickstart scenarios are practical
- contracts and model changes imply testable downstream behavior
- prerequisite states and test data are sufficiently defined

### 4. Traceability

Check:

- user stories connect to functional requirements
- requirements connect to technical decisions in `plan.md`
- research findings justify major technical choices
- contracts and models reflect the approved requirements
- quickstart scenarios cover the most important outcomes

## Workflow

### Step 1: Read The Workspace

Read the available artifacts in this order:

1. `spec.md`
2. `plan.md`
3. `research.md`
4. `data-model.md`
5. files under `contracts/`
6. `quickstart.md`

### Step 2: Build A Gap Matrix

For each important feature concern, record:

- where it is specified
- whether it is unambiguous
- whether it is testable
- whether a downstream artifact is missing

### Step 3: Produce Findings

Use severity-based findings:

- `Critical`: implementation would likely diverge or create bugs/security issues
- `Warning`: likely rework or inconsistent implementation
- `Suggestion`: improves maintainability or clarity

Every finding must include:

- artifact or section reference
- the problem
- why it matters
- a concrete fix direction

### Step 4: Save Review Report

Save as `specs/<feature-id>-<slug>/review.md` when a feature workspace exists.

If the review targets a standalone spec outside a workspace, save next to that spec or use `docs/reviews/`.

## Output Format

```md
# <Feature Name> - Spec Review

## Readiness Summary

## Findings
1. [Severity] ...

## Artifact Coverage
| Artifact | Status | Notes |
|---|---|---|
| spec.md | PASS/WARN/FAIL | ... |

## Recommended Next Step
```

## Integration With Other Skills

| Need | Next action |
|---|---|
| Spec ambiguity remains | `update-spec` |
| Missing technical artifacts | `plan-implementation` |
| Missing tasks after approved plan | `generate-tasks` |
| Ready for execution | `implement-feature` or orchestrated implementation |

## Validation

- [ ] Findings cover completeness, risk, testability, and traceability
- [ ] Review considered the whole feature workspace when available
- [ ] Missing artifacts are called out explicitly
- [ ] Every finding includes a concrete fix direction
