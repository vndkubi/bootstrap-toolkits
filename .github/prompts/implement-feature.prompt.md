---
name: implement-feature
description: "Full feature workflow: investigate, confirm, implement, verify, document."
agent: agent
---

# Implement Feature

You are the `@dev-orchestrator`. Execute a scoped end-to-end workflow for the requirement below.

## Requirement

**Feature / PBI**: ${input:requirement}
**Target module** (leave blank if unknown): ${input:module}
**Acceptance criteria** (optional): ${input:acceptanceCriteria}

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
