---
name: orchestrate-development
description: 'Full lifecycle development orchestration skill for agile teams. Receives a requirement or PBI then executes the complete workflow: investigate as-is/to-be, estimate effort, confirm analysis with user, multi-stack implementation (Java/.NET/Python/PHP), unit tests with 100% branch coverage, PR description, conventional commits, and markdown documentation. Supports sprint-aware estimation and architectural decision-making. Use when asked to implement a feature end-to-end, take a PBI from analysis to completion, or do full-stack implementation with tests and docs.'
---

# Orchestrate Development

Full lifecycle development workflow from requirement to delivery, supporting multiple tech stacks.

## When to Use

- User provides a PBI, user story, or requirement and wants end-to-end implementation
- User asks to "implement and test" or "take this from start to finish"
- User wants investigation + implementation + tests + PR + documentation in one flow
- Keywords: "implement end-to-end", "full implementation", "analyze and implement", "requirement to delivery"

## Tech Stack Detection

Automatically detect and adapt to the project's tech stack:
- `pom.xml` / `build.gradle` → Java/Jakarta EE/Spring Boot
- `*.csproj` / `*.sln` → .NET/C#/ASP.NET Core
- `pyproject.toml` / `manage.py` → Python/Django/FastAPI
- `composer.json` / `artisan` → PHP/Laravel/Symfony
- `build.gradle.kts` + Android → Android/Kotlin
- `Package.swift` / `*.xcodeproj` → iOS/Swift

## Workflow

### Step 1: Parse Requirement
- Extract what, why, scope, constraints, acceptance criteria
- Detect tech stack from project files
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
- **Estimate effort** — story points with task breakdown by layer

### Step 3: Confirm with User ⏸️
- Present structured investigation summary with effort estimate
- List all files to create and modify
- Show scenarios, risks, and architecture decisions
- **Wait for explicit user confirmation before proceeding**

### Step 4: Implement (Stack-Adaptive)

**Java/Jakarta EE**: Migration → Entity → DTO → Mapper → Repository → Service → Resource
**Java/Spring Boot**: Migration → Entity → DTO → Mapper → Repository → Service → Controller
**.NET/C#**: Entity + EF Config → Migration → DTO → Validator → Repository → Service/Handler → Controller → DI
**Python (FastAPI)**: SQLAlchemy Model → Alembic Migration → Pydantic Schema → Repository → Service → Dependencies → Router
**Python (Django)**: Model → Migration → Serializer → Service/Selector → View/ViewSet → URL
**PHP (Laravel)**: Model → Migration → FormRequest → API Resource → Service → Controller → Route
**PHP (Symfony)**: Entity → Migration → DTO → Repository → Service → Controller → Validator

Universal rules:
- Follow existing codebase patterns exactly
- No duplicate validation across layers
- Add proper documentation
- Respect module boundaries

### Step 5: Write Unit Tests
- Analyze ALL branches in implemented code
- Create test builders/factories for entities/DTOs
- Use the stack's preferred testing framework:
  - Java: JUnit 5 + AssertJ + @Nested/@DisplayName
  - .NET: xUnit + FluentAssertions + nested classes
  - Python: pytest + pytest-asyncio + factory_boy
  - PHP: PHPUnit/Pest + Model Factories
- Use real objects wherever possible, minimize mocks
- Target 100% branch coverage
- Ensure all tests execute fast (<100ms each)

### Step 6: Generate PR Description & Commits
- Generate conventional commit messages for each logical change
- Generate structured PR description with:
  - Summary, changes, testing notes, impact analysis, review checklist

### Step 7: Generate Documentation
- Create markdown report with: summary, files changed, API changes, test coverage, scenarios verified
- Include architecture decisions (ADRs) for significant changes

### Step 8: Final Summary
- Report all deliverables (code files, test files, docs, migrations, PR description)
- Provide quick verification command (stack-appropriate)
- Compare estimated vs actual effort

## Validation
- All production code compiles / passes static analysis
- All unit tests pass
- Branch coverage meets 100% target
- Documentation is complete and accurate
- Existing tests still pass
- **Existing code flow was traced before implementation**
- **No duplicate validation across layers** (Controller/Service/Repository)
- **No duplicate logic across modules** (multi-module projects)
- **Business logic confirmed** — changes match existing business rules
- **PR description generated and review-ready**
