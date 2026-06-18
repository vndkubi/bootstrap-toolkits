# Review Lane

## Goal

Give one obvious path for code review work so reviewers do not need to reverse-engineer prompts, agents, and skills before starting.

## Which Entry To Use

| Situation | Use | Outcome |
|---|---|---|
| Small or normal review with clear scope | `/review-code` or `@code-reviewer` | Full review report + structured `review-report.json` block |
| High blast radius, weak business context, or oversized PR | `/plan-review-scope` first | Review Scope Plan only, no verdict yet |
| Repeated accepted findings worth reusing | `/promote-review-memory` | Candidate checklist or memory promotions |
| Review should improve future development behavior | review `developmentLearning[]` then `/promote-review-memory` | Development-skill or instruction upgrade candidates |

## Full Review Shape

1. Stage 0: load changed files, callers, dependencies, and business anchors
2. Stage 1: quick hygiene gate
3. Stage 2: functional review first
4. Stage 3: technical review
5. Stage 3b: mobile review when mobile files are in scope
6. Stage 4: Codex-style finding calibration with P0-P3 priority
7. Stage 5: development learning candidate extraction when findings reveal reusable process gaps
8. Final output: markdown report + final fenced JSON block for `review-report.json`

## Closed Learning Loop

Use this loop when review findings should improve future development:

```text
develop -> evidence -> review -> developmentLearning[] -> promotion candidate -> approved development upgrade
```

`developmentLearning[]` should target the smallest surface that prevents recurrence: `orchestrate-development`, `implement-feature`, `tdd-implement-loop`, `generate-unit-tests`, Java testing instructions, agent routing, or review checklist packs.

## Default Checklist Packs

- `docs/reviews/checklists/functional-core.md`
- `docs/reviews/checklists/technical-core.md`
- `docs/reviews/checklists/java-finance-enterprise.md` when Java finance, banking, payment, pricing, ledger, authorization, migration, PII, or regulated-data code is in scope
- `docs/reviews/checklists/mobile-core.md` when mobile files are present

## Key Rules

- Do not review from diff chunks alone.
- Functional blockers short-circuit the rest of the pipeline.
- Only publish findings that are discrete, introduced by the change, actionable, and likely worth fixing.
- Use `[P0]`-`[P3]` priority labels and short line ranges for every finding.
- Low-confidence risky changes should end in `needs-clarification`, not a fake pass.
- The final review output must be understandable to both humans and automation.
- Durable review lessons must become approval-gated learning candidates, not silent edits to development rules.
