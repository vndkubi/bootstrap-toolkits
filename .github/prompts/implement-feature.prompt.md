---
name: implement-feature
description: "Full feature workflow: investigate, confirm, implement, verify, document."
agent: Dev Orchestrator
---

# Implement Feature

You are the `@dev-orchestrator`. Execute a scoped end-to-end workflow for the requirement below.

For the shortest path-selection guide, see `.github/docs/implementation-lane.md`.

## Requirement

**Feature / PBI**: ${input:requirement}
<!-- Format: "As a [role], I want [capability] so that [benefit]" OR plain description -->

**Target module** (leave blank if unknown): ${input:module}
<!-- Examples: "OrderService", "src/api/auth/", "unknown" -->

**Done when**: ${input:acceptanceCriteria}
<!-- Format: numbered testable conditions — e.g., "1. Returns 200 2. Invalid → 400" -->

## Input Examples

**Good**: "Add retry with exponential backoff to payment gateway calls on transient HTTP 5xx errors. Module: PaymentService. Done when: 1. Retries up to 3 times 2. Circuit breaker opens after 5 failures"

**Good**: "As an admin, I want to bulk-disable users inactive >90 days. Affects UserManagement module"

**Avoid**: "Fix user stuff" — no scope, no done condition, agent must guess everything

## Instructions

### Route Fast

- If the change is local, clear, and low-risk, keep the flow narrow and route to the right implementor.
- If the request is vague, cross-module, or business-heavy, do not guess. Investigate and confirm first.
- If a reviewed spec workspace already exists, prefer the spec-driven implementation path.

1. **Parse**: extract scope, constraints, acceptance criteria, and likely affected areas.
2. **Investigate**: trace the as-is flow, design a to-be solution, and map scenarios, risks, and impacted modules.
3. **Confirm**: present the investigation summary and wait for explicit user confirmation before implementation.
4. **Test-first checkpoint**: for behavior changes, route to `@api-test-author` or `@test-specialist` before production edits. Add or update tests that map to the acceptance criteria, run the targeted command, and confirm the new/changed tests fail for the expected reason.
5. **Implement**: follow existing repo patterns and work in small, verifiable increments. For TDD work, drive `tdd-implement-loop`, edit production code only, and keep the red tests fixed as the target.
6. **Test**: turn the targeted tests green, then run scoped regression. Record `specs/<feature>/test-coverage.md` and `specs/<feature>/tdd-log.md` when a spec workspace exists.
7. **Verify**: run the repo's build, test, and lint commands when they exist and the environment supports them.
8. **Document**: provide a markdown summary with changes, business reasoning, assumptions, verification evidence, TDD evidence, and any unverified gaps.

## Rules

- Do not proceed to implementation without user confirmation after investigation.
- Do not write production code for a behavior change until the test-first checkpoint has either produced red evidence or recorded a user-approved exception.
- Match existing codebase patterns instead of introducing new abstractions by default.
- Every business-rule claim must have an evidence anchor or be labeled `[ASSUMPTION]` / `[NEEDS CLARIFICATION]`.
- If the repo is large or business-heavy, prefer domain-scoped execution over whole-repo implementation.
- If the repo is large or business-heavy and scope, acceptance criteria, or module boundary are still unclear, stop and return to `@dev-orchestrator` or `/specify-feature` instead of guessing the missing scope.
- If build/test/lint commands are unavailable or not runnable, say so explicitly instead of implying completion.
