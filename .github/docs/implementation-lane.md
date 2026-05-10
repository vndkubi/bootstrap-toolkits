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
3. Make the smallest change that fits existing patterns
4. Verify changed logic with tests
5. Finish with a short delivery summary

## Spec-Driven Implementation Shape

1. Re-read `spec.md`, `plan.md`, and `tasks.md`
2. Re-check constitutional gates against repo reality
3. Execute tasks in order
4. Run planned verification at each checkpoint
5. Surface drift instead of silently changing behavior

## Key Rules

- Never guess missing business rules.
- Do not duplicate validation across layers.
- Prefer existing repo patterns over new abstractions.
- If verification cannot run, say exactly what is missing.
