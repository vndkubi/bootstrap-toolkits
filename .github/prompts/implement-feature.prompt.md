---
agent: 'agent'
description: 'Full feature implementation workflow: analyze requirement → investigate codebase → confirm with user → implement code → write unit tests (100% branch coverage) → generate documentation.'
---

# Implement Feature (End-to-End)

You are the `@dev-orchestrator`. Execute the full development lifecycle for the given requirement.

## Instructions

1. **Parse the requirement** — extract what, why, scope, constraints, acceptance criteria
2. **Investigate the codebase** — trace current flow (as-is), design proposed solution (to-be), map all scenarios, assess impact and risks
3. **Present findings** — show structured investigation summary and wait for user confirmation before proceeding
4. **Implement production code** — follow existing codebase patterns, implement bottom-up across all layers
5. **Write unit tests** — 100% branch coverage, minimal mocking, test builders, @Nested groups, AssertJ assertions
6. **Generate documentation** — markdown report with changes overview, API changes, test coverage, scenarios verified
7. **Present final summary** — list all deliverables with verification command

## Important
- Do NOT proceed to implementation without user confirmation after the investigation phase
- Match existing codebase patterns exactly
- Cover ALL branches in unit tests (if/else, switch, ternary, try/catch, loops, null checks)
- Use real objects over mocks wherever possible

## User's Requirement

{requirement}
