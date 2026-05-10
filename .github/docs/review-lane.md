# Review Lane

## Goal

Give one obvious path for code review work so reviewers do not need to reverse-engineer prompts, agents, and skills before starting.

## Which Entry To Use

| Situation | Use | Outcome |
|---|---|---|
| Small or normal review with clear scope | `/review-code` or `@code-reviewer` | Full review report + structured `review-report.json` block |
| High blast radius, weak business context, or oversized PR | `/plan-review-scope` first | Review Scope Plan only, no verdict yet |
| Repeated accepted findings worth reusing | `/promote-review-memory` | Candidate checklist or memory promotions |

## Full Review Shape

1. Stage 0: load changed files, callers, dependencies, and business anchors
2. Stage 1: quick hygiene gate
3. Stage 2: functional review first
4. Stage 3: technical review
5. Stage 3b: mobile review when mobile files are in scope
6. Final output: markdown report + final fenced JSON block for `review-report.json`

## Default Checklist Packs

- `docs/reviews/checklists/functional-core.md`
- `docs/reviews/checklists/technical-core.md`
- `docs/reviews/checklists/mobile-core.md` when mobile files are present

## Key Rules

- Do not review from diff chunks alone.
- Functional blockers short-circuit the rest of the pipeline.
- Low-confidence risky changes should end in `needs-clarification`, not a fake pass.
- The final review output must be understandable to both humans and automation.
