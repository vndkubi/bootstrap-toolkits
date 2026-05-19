---
agent: Dev Orchestrator
description: "Create a detailed implementation plan from an approved feature specification. Translates requirements into technical architecture, data models, API contracts, and phased implementation steps."
---

# Plan Implementation

Follow the `plan-implementation` skill to create a comprehensive implementation plan from an existing feature specification.

For the shortest path-selection guide, see `.github/docs/implementation-lane.md`.

## Instructions

1. Locate the feature specification in `specs/<feature>/spec.md`. If no spec exists, recommend running `/specify-feature` first.
2. Read and validate the specification — check for unresolved `[NEEDS CLARIFICATION]` markers.
3. Generate an implementation plan that includes:
   - technical architecture and key design decisions
   - data model definitions
   - API contracts
   - phased implementation steps with prerequisites
   - test-first strategy (which tests must be red before production edits, plus contract tests, integration tests, and unit tests)
   - verification and acceptance criteria mapping
4. Write the plan and supporting artifacts to the feature directory:
   - `specs/<feature>/plan.md`
   - `specs/<feature>/data-model.md` (when applicable)
   - `specs/<feature>/contracts/` (when applicable)
   - `specs/<feature>/research.md` (when technical research was needed)
5. After the plan is approved, recommend `/implement-feature` as the next step.

## TDD Planning Rule

For any behavior, bug, API, or business-rule change, the plan must name the first red test checkpoint before implementation begins:

- acceptance criterion or regression covered
- test file or test surface to create/update
- command to run for the expected RED result
- expected failure reason
- follow-up GREEN verification command

## Constitutional Compliance

The plan must pass Phase -1 gates (Simplicity, Anti-Abstraction, Integration-First) defined in the project constitution.
