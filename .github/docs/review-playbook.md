# Review Playbook

## Purpose

Give reviewers a consistent way to plan and execute deep code reviews, especially for high-blast-radius changes and large repositories.

## Source of Truth

- `.github/prompts/plan-review-scope.prompt.md`
- `.github/skills/review-code-changes/SKILL.md`
- `.github/agents/code-reviewer.agent.md`
- `.github/agents/functional-reviewer.agent.md`
- `.github/prompts/promote-review-memory.prompt.md`

## When To Use

Use this playbook when:

- the PR may have large blast radius even if the diff is small
- the change touches shared contracts, state transitions, pricing, auth, compliance, or cross-domain writes
- business context confidence is not obviously High
- the repository is large enough that review order matters
- the team wants reusable checklist learning from accepted human review discussion

## Recommended Workflow

1. Run `/plan-review-scope` first.
2. Review the generated Review Scope Plan.
3. If the change is simple and local, continue with the normal review flow.
4. If the change is high-blast-radius or low-confidence, review by slices in the planned order.
5. Run the full `@code-reviewer` flow.
6. If the review and human discussion reveal durable lessons, run `/promote-review-memory` afterward.

Default checklist packs to apply when no narrower pack exists yet:

- `docs/reviews/checklists/functional-core.md`
- `docs/reviews/checklists/technical-core.md`
- `docs/reviews/checklists/mobile-core.md` for mobile slices

Only use the promotion step when the lesson is backed by an accepted human fix or resolved human discussion, or when the same reasoning recurs across at least two reviews or investigations.

## Review Complexity Model

Treat review size as a **review-complexity** problem, not only a diff-size problem.

| Dimension | What to look for |
|---|---|
| Diff size | file count, changed LOC, generated churn |
| Blast radius | callers, dependents, downstream consumers, cross-service contracts |
| Business criticality | money, auth, compliance, state transitions, cross-domain writes |
| Context confidence | requirement quality, business docs, tests, stable callers |

A 1-2 file change can still be `Business-critical` or `Shared-surface` if it has large blast radius.

## Review Scope Plan Template

Use this exact shape when `/plan-review-scope` is invoked.

```markdown
## Review Scope Plan

**PR / Branch**: ...
**Base**: ...
**Diff Size**: Small / Medium / Large / Huge
**Review Complexity**: Local / Shared-surface / Cross-domain / Business-critical / Low-context high-risk
**Business Context Used**: [docs / workflows / glossary / fallback signals / "not found"]
**Business Context Confidence**: High / Medium / Low

## Why This Needs Planning
- ...

## Highest-Risk Surfaces
- ...

## Files To Load First
- ...

## Callers / Dependents To Inspect
- ...

## Functional Scenario Pack
- Happy path: ...
- Invalid path: ...
- Boundary path: ...
- State-transition path: ...
- Cross-domain side-effect path: ...
- Regression-sensitive path: ...

## Review Slices
1. ...
2. ...
3. ...

## Checklist Packs To Apply
- ...

## Missing Anchors
- [NEEDS CLARIFICATION: ...]
```

## Key Constraints

- Do not produce findings or a verdict in planning-only mode.
- Prefer blast radius over raw LOC when deciding whether to plan first.
- If business docs are missing, state the fallback signals and confidence level explicitly.
- Keep the plan short enough that another reviewer or agent can execute it immediately.

## Verification

- The plan names review complexity, business context confidence, and highest-risk surfaces.
- The plan identifies the first files to load rather than dumping the full PR.
- The plan includes a functional scenario pack for the highest-risk flows.
- The plan states missing anchors or clarification needs explicitly.
- Full review runs end with a structured `review-report.json` contract aligned with `.github/schemas/review-report.schema.json`.

## Common Failure Modes

- Treating every large diff as equally risky
- Skipping planning for a tiny diff that changes a shared or business-critical flow
- Producing a verdict before blast radius and business context are understood
- Dumping a giant file list instead of prioritizing load order
- Hiding low business-context confidence instead of stating it plainly

## Related Files

- `.github/docs/user-playbook.md`
- `.github/docs/prompt-and-context.md`
- `.github/skills/review-memory-promotion/SKILL.md`
