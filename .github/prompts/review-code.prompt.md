---
agent: Code Reviewer
description: "Run a multi-stage code review pipeline: functional review, technical review, optional mobile review, and Codex-style finding calibration. Produces a combined review report with P0-P3 actionable findings."
---

# Review Code

Route this request to `@code-reviewer`.

For the shortest operator guide, see `.github/docs/review-lane.md`.

## Instructions

1. Identify the branch, PR, or set of changes to review.
2. Run the full review pipeline:
   - **Stage 0**: Context gathering — load changed files, trace imports, locate requirement docs.
   - **Stage 1**: Self-review gate — compile, tests, secrets check.
   - **Stage 2**: Functional review via `@functional-reviewer` — business logic, acceptance criteria, data integrity.
   - **Stage 3**: Technical review via `@technical-reviewer` — architecture, migration safety, domain boundaries, NFRs.
   - **Stage 3b** (conditional): Mobile review via `@mobile-reviewer` — only when mobile files are detected.
   - **Stage 4**: Finding calibration — keep only introduced, discrete, actionable findings and assign P0-P3 priority.
3. Short-circuit on functional blockers: if Stage 2 finds a blocker, reject immediately without running Stage 3.
4. Produce a combined review report with verdict.
5. End the full review with a machine-readable fenced JSON block for `review-report.json`.

## Clarification

If the user does not specify a branch or PR, ask:
- Which branch or PR to review
- Any specific focus areas (business logic, performance, security, migration safety)
