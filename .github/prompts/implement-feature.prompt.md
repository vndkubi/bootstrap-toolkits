---
name: implement-feature
description: "Full feature workflow: investigate, confirm, implement, verify, document."
agent: Dev Orchestrator
---

# Implement Feature

You are the `@dev-orchestrator`. Execute a scoped end-to-end workflow for the requirement below.

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

1. **Parse**: extract scope, constraints, acceptance criteria, and likely affected areas.
2. **Investigate**: trace the as-is flow, design a to-be solution, and map scenarios, risks, and impacted modules.
3. **Confirm**: present the investigation summary and wait for explicit user confirmation before implementation.
4. **Implement**: follow existing repo patterns and work in small, verifiable increments.
5. **Test**: target high branch coverage for changed logic, especially critical branches, edge cases, and regression paths.
6. **Verify**: run the repo's build, test, and lint commands when they exist and the environment supports them.
7. **Document**: provide a markdown summary with changes, business reasoning, assumptions, verification evidence, and any unverified gaps.

## Rules

- Do not proceed to implementation without user confirmation after investigation.
- Match existing codebase patterns instead of introducing new abstractions by default.
- Every business-rule claim must have an evidence anchor or be labeled `[ASSUMPTION]` / `[NEEDS CLARIFICATION]`.
- If the repo is large or business-heavy, prefer domain-scoped execution over whole-repo implementation.
- If build/test/lint commands are unavailable or not runnable, say so explicitly instead of implying completion.
