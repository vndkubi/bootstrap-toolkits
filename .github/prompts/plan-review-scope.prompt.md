---
name: plan-review-scope
description: "Plan a code review before deep review work starts by classifying blast radius, business-context confidence, scenario coverage, and slice order for high-complexity PRs or high-impact small diffs."
agent: Code Reviewer
---

# Plan Review Scope

Use the `@code-reviewer` in planning-only mode to prepare a reliable review plan before running the full review pipeline.

Use the canonical Review Scope Plan template from `.github/docs/review-playbook.md`.

## Inputs

**PR / Branch reference**: ${input:reference}
<!-- Examples: "PR #1842", "feature/billing-rewrite vs main", "release/hotfix-payment" -->

**Base branch**: ${input:base}
<!-- Examples: "main", "develop" -->

**Known focus areas** (optional): ${input:focus}
<!-- Examples: "API compatibility, pricing logic", "migration safety", "auth + permissions" -->

**Known requirement or issue** (optional): ${input:requirement}
<!-- Examples: "PBI-1024", "Discount cap fix", "none" -->

## Instructions

1. Run **Stage 0 only** from `review-code-changes`.
2. Load the changed files, related files, callers, dependents, and business context.
3. If business docs are missing, derive provisional business context from the strongest remaining repo signals and record confidence.
4. Classify the review by:
   - diff size
   - review complexity
   - blast radius
   - business-context confidence
5. Build a functional scenario pack for the highest-risk flows.
6. Decide whether the PR can be reviewed in one pass or must be sliced.
7. Recommend the loading order, slice order, and checklist packs to apply.
8. Stop after the plan. Do **not** produce review findings or a merge verdict yet.

## Output Format

Follow the `Review Scope Plan Template` in `.github/docs/review-playbook.md`.

## Rules

- Prefer blast radius over raw LOC as the reason to escalate review planning.
- A 1-2 file change can still be `Business-critical` or `Shared-surface`.
- If confidence is Low, say so explicitly instead of pretending the business intent is known.
- Keep the plan short, concrete, and immediately usable by `@code-reviewer` for the next step.