---
name: orchestrate-development
description: 'Full lifecycle development orchestration skill. Receives a requirement or PBI then executes the complete workflow: investigate as-is/to-be, confirm analysis with user, implement production code, write unit tests with 100% branch coverage, and generate markdown documentation. Use when asked to implement a feature end-to-end, take a PBI from analysis to completion, or do full-stack implementation with tests and docs.'
---

# Orchestrate Development

Full lifecycle development workflow from requirement to delivery.

## When to Use

- User provides a PBI, user story, or requirement and wants end-to-end implementation
- User asks to "implement and test" or "take this from start to finish"
- User wants investigation + implementation + tests + documentation in one flow
- Keywords: "implement end-to-end", "full implementation", "analyze and implement", "requirement to delivery"

## Workflow

### Step 1: Parse Requirement
- Extract what, why, scope, constraints, acceptance criteria
- Ask clarifying questions if ambiguous

### Step 2: Investigate
- **Trace current code flow (as-is)** — follow the full call chain, understand what each layer handles
- **Identify layer responsibilities** — document which layer handles which validation to prevent duplication
- **Confirm business logic alignment** — verify proposed changes match existing business rules
- Design proposed solution (to-be)
- Map all scenarios (happy path, errors, edge cases, concurrency)
- Assess impact on existing code and database
- In multi-module projects, map module boundaries and responsibilities
- Identify risks with mitigation plans

### Step 3: Confirm with User ⏸️
- Present structured investigation summary
- List all files to create and modify
- Show scenarios and risks
- **Wait for explicit user confirmation before proceeding**

### Step 4: Implement
- Create database migrations first
- Implement bottom-up: Entity → DTO → Mapper → Repository → Service → Resource
- Follow existing codebase patterns exactly
- Add proper documentation (JavaDoc/KDoc)

### Step 5: Write Unit Tests
- Analyze ALL branches in implemented code
- Create test builders for entities/DTOs
- Write tests with @Nested groups and @DisplayName
- Use real objects wherever possible, minimize mocks
- Target 100% branch coverage
- Ensure all tests run under 100ms

### Step 6: Generate Documentation
- Create markdown report with: summary, files changed, API changes, test coverage, scenarios verified
- Save to project's docs directory

### Step 7: Final Summary
- Report all deliverables (code files, test files, docs, migrations)
- Provide quick verification command

## Validation
- All production code compiles
- All unit tests pass
- Branch coverage meets 100% target
- Documentation is complete and accurate
- Existing tests still pass
- **Existing code flow was traced before implementation**
- **No duplicate validation across layers** (REST/Service/Repository)
- **No duplicate logic across modules** (multi-module projects)
- **Business logic confirmed** — changes match existing business rules
