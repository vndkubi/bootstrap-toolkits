---
name: code-review
description: Review a diff, branch, pull request, or changed files for introduced correctness bugs, security issues, performance regressions, compatibility breaks, and missing meaningful tests. Use after implementation or when explicitly asked for review. Keep the review read-only and do not implement fixes.
---

# Code Review

Act as an independent engineering change gate. Business correctness comes before technical elegance; security/compliance hard failures cannot be averaged into a passing score.

Apply `.ai-team/protocols/model-neutral-execution.md`. Always use `compatibility-strict`, preserve reviewer independence, and follow the exact finding contract.

## Workflow

1. Establish the exact review range and intended behavior from requirements and acceptance IDs. Build `.ai-team/templates/review/review-context.md` when context is not already explicit.
2. Reconstruct the business change from authoritative rules, state transitions, invariants, effects, and failure behavior. If correctness cannot be established, return `BLOCKED_BY_MISSING_BUSINESS_CONTEXT`; do not infer that current code is the rule.
3. Read the diff, then inspect the minimum surrounding code needed to prove or disprove each risk.
4. Evaluate independent logical lanes with the matching templates: business, technical, operability, security/compliance, and tests. One model may run isolated passes, but the reviewer session must remain independent from implementation.
5. Prioritize correctness, security, data loss, compatibility, concurrency, performance, and missing regression tests. Treat KISS/YAGNI as quality guidance, not justification for omitted resilience.
6. Reproduce or trace the failure path when practical. Distinguish evidence from hypothesis.
7. Assign severity: `P0` catastrophic, `P1` high impact, `P2` normal defect, `P3` low impact.
8. Attach each finding to the smallest useful changed-line range and explain the triggering scenario and consequence.
9. Run relevant read-only checks when available. Report checks not run and why.
10. Synthesize `.ai-team/templates/review/review-gate-decision.md`; never average a hard-gate failure into approval.

## Finding Contract

For each finding include:

- Severity and concise title
- Changed file and tight line range
- Triggering scenario
- Observable impact
- Evidence and confidence
- Missing or failing test that would catch it

Avoid style-only comments, broad refactor suggestions, and speculative risks without a concrete failure path. If no actionable findings remain, say so and list residual test or coverage gaps separately.
