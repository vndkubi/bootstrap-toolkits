# Implementation Lane

## Goal

Make it obvious which implementation path to take before coding starts.

## Which Entry To Use

| Situation | Use | Outcome |
|---|---|---|
| Local, clear, low-risk code change | `@implementor` or stack implementor | Direct implementation with repo-pattern alignment |
| Non-trivial feature with approved spec workspace | `/implement-feature` | Spec-driven implementation with verification checkpoints |
| Vague, cross-module, high-risk, or business-heavy request | `@dev-orchestrator` or `/specify-feature` first | Investigation, scope clarification, then plan or implementation |
| Need technical plan before coding | `/plan-implementation` | `plan.md` + supporting spec-kit artifacts |
| Need strict TDD | `/implement-feature` after an approved plan | Red test checkpoint, production-only implementation, green regression evidence |

## Fast Path Decision

Use direct implementation only when all are true:

- scope is local
- acceptance criteria are explicit
- business context is stable enough
- no shared-surface or cross-module risk demands orchestration

If any item fails, route back to orchestration or the spec pipeline before coding.

## Direct Implementation Shape

1. Read current code flow first
2. Confirm business rules and module boundaries
3. For behavior changes, write or update the failing regression/unit test first
4. Make the smallest production-code change that fits existing patterns
5. Verify changed logic with targeted and scoped regression tests
6. Finish with a short delivery summary

## Spec-Driven Implementation Shape

1. Re-read `spec.md`, `plan.md`, and `tasks.md`
2. Re-check constitutional gates against repo reality
3. Author or update RED tests and `test-coverage.md` before production edits
4. Execute tasks in order using `tdd-implement-loop` where behavior changes are involved
5. Run planned verification at each checkpoint and record `tdd-log.md`
6. Surface drift instead of silently changing behavior

## TDD Evidence

For strict TDD work, completion evidence should include:

- the targeted RED command and expected failure reason
- the GREEN command after implementation
- `specs/<feature>/test-coverage.md` for AC-to-test mapping when a spec workspace exists
- `specs/<feature>/tdd-log.md` for red->green iterations when a TDD loop was used

## Key Rules

- Never guess missing business rules.
- Do not duplicate validation across layers.
- Prefer existing repo patterns over new abstractions.
- If verification cannot run, say exactly what is missing.
- Do not skip or disable failing tests to make the loop green.
