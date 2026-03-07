# Copilot Bootstrap Toolkit

An automated system that analyzes any codebase and generates a complete GitHub Copilot configuration — including custom agents, skills, instructions, hooks, agentic workflows, and domain context.

## Overview

Bootstrap Toolkit contains a **conductor agent** that orchestrates specialized sub-agents through a pipeline:

```
Analyze → Generate Instructions → Generate Agents → Generate Skills → Generate Hooks → Generate Workflows → Validate
```

Each sub-agent is an expert in its own domain, designed for senior developers working in agile teams across multiple tech stacks.

## Available Agents

### Core Development Agents

| Agent | Purpose |
|-------|---------|
| `@conductor` | Main orchestrator — coordinates the entire bootstrap pipeline and developer workflows |
| `@codebase-analyzer` | Analyzes codebase: languages, frameworks, architecture, conventions, domain map |
| `@investigator` | Investigates PBIs: as-is/to-be, scenarios, impact analysis, risk assessment → markdown |
| `@implementor` | Java/Jakarta EE implementation: writes code following project patterns, across all layers |
| `@dotnet-implementor` | .NET/C# implementation: ASP.NET Core, EF Core, Clean Architecture, CQRS/MediatR |
| `@python-implementor` | Python implementation: Django/FastAPI, SQLAlchemy, Pydantic, async/await |
| `@php-implementor` | PHP implementation: Laravel/Symfony, Eloquent/Doctrine, PSR standards |
| `@test-specialist` | Unit tests: minimal mocks, full branch coverage, test builders, JUnit 5 |
| `@sequence-diagrammer` | Mermaid sequence diagrams: trace flows, mark changes with 🆕✏️❌ |
| `@code-reviewer` | Code review: per-file analysis → structured markdown with severity ratings |
| `@mock-data-specialist` | WireMock stubs, test fixtures, mock data for local/devcontainer |
| `@agent-generator` | Meta-agent: generates agents/skills/instructions from codebase analysis |

### Mobile Development Agents

| Agent | Purpose |
|-------|---------|
| `@mobile-implementor` | Mobile implementation: Android (Kotlin/Compose) and iOS (Swift/SwiftUI) |
| `@mobile-test-specialist` | Mobile tests: JUnit/MockK/Turbine (Android), XCTest/Swift Testing (iOS) |
| `@mobile-architect` | Mobile architecture: MVVM, Clean Architecture, module structure |

### Agile & Workflow Agents

| Agent | Purpose |
|-------|---------|
| `@dev-orchestrator` | Full lifecycle: requirement → investigate → confirm → implement → test → PR → documentation |
| `@sprint-planner` | Sprint planning: PBI decomposition, story point estimation, capacity planning, risk assessment |
| `@refactoring-specialist` | Refactoring: code smell detection, safe refactoring, tech debt reduction, before/after metrics |
| `@pr-manager` | PR lifecycle: description generation, review readiness, merge strategy, changelog |

### DevContainer & Infrastructure Agents

| Agent | Purpose |
|-------|--------|
| `@devcontainer-reviewer` | DevContainer review: optimize performance, security, DX, generate configs |

## Supported Tech Stacks

| Stack | Languages & Frameworks | Agents |
|-------|----------------------|--------|
| **Java Enterprise** | Java, Maven/Gradle, Jakarta EE, Spring Boot, Oracle | `@implementor`, `@test-specialist` |
| **.NET** | C#, ASP.NET Core, EF Core, MediatR, SQL Server | `@dotnet-implementor` |
| **Python** | Python 3.11+, Django, FastAPI, SQLAlchemy, PostgreSQL | `@python-implementor` |
| **PHP** | PHP 8.x, Laravel, Symfony, Eloquent/Doctrine, MySQL | `@php-implementor` |
| **Android** | Kotlin, Jetpack Compose, Hilt, Room, Retrofit | `@mobile-implementor`, `@mobile-test-specialist` |
| **iOS** | Swift, SwiftUI, async/await, Core Data/SwiftData | `@mobile-implementor`, `@mobile-test-specialist` |

## Core Principles

### 1. Understand Before Changing — Read the Current Code Flow First

**Every agent and skill MUST thoroughly read and trace the existing code flow before making any change.** Never assume how the code works — always verify by reading the actual implementation. This applies to investigation, implementation, testing, code review, and all other workflows.

- Trace the full call chain: Controller/Resource → Service → Repository → Database
- Understand what each layer is responsible for (validation, business logic, data access)
- Identify what is already handled at each layer before proposing changes

### 2. Confirm Business Logic — Match Existing Business Rules

Before implementing or suggesting changes, confirm that they align with the current business logic and rules already in the codebase. Do not introduce behavior that contradicts existing business flows unless explicitly requested with clear justification.

- If the codebase validates a field at the service layer, respect that pattern
- If business rules are enforced via database constraints, don't duplicate them incorrectly in code
- When in doubt, present findings and ask the user to confirm the business intent

### 3. No Duplicate Validation Across Layers

**Critical rule**: If validation is already handled at one layer, do NOT duplicate it at another layer unless there is a clear architectural reason (e.g., defense-in-depth for security input sanitization).

- **REST/Controller layer**: Input format validation (Bean Validation: `@NotNull`, `@Size`, `@Pattern`)
- **Service layer**: Business rule validation (e.g., "order total must not exceed credit limit")
- **Repository/Database layer**: Data integrity constraints (unique, foreign key, check constraints)

Each layer validates what it owns. Do not re-validate upstream concerns downstream.

### 4. Multi-Module Awareness

In multi-module projects, understand module boundaries before making changes:

- Identify which module owns a given responsibility (validation, transformation, persistence)
- Do not duplicate logic that is already handled by another module
- Respect module APIs — don't bypass a module's public interface to access its internals
- When reviewing code, flag cross-module duplication as a 🔴 Critical issue

### 5. Clarify Before Acting — Ask the Right Questions First

**Every agent MUST ask clarifying questions when the user's request lacks sufficient detail to proceed accurately.** Do not guess or make assumptions about business logic, scope, constraints, or preferences.

- **Compose domain-specific questions** in the chat and wait for the user's answers before proceeding
- **Batch related questions** (max 3-5 at a time) — don't overwhelm with 20 questions at once
- **Provide sensible defaults** when possible: "I'll use PostgreSQL unless you prefer another database?"
- **Confirm understanding** before major actions: summarize what you understood and ask the user to confirm
- **Skip obvious questions**: If the codebase already answers a question (e.g., the project uses Maven), don't ask — just confirm your assumption briefly
- **Re-ask only when requirements change**: Once answered, incorporate the decision and don't re-ask

When to ask:
- The request is ambiguous ("implement the feature" — which feature? which layer?)
- Multiple valid approaches exist ("CQRS or traditional CRUD?")
- Business rules are unclear ("what happens when the discount exceeds the order total?")
- Infrastructure decisions affect cost or performance ("how much RAM for Docker?")
- Breaking changes are possible ("this will change the API contract — is that acceptable?")

When NOT to ask:
- The answer is clearly in the codebase (project uses Spring Boot → don't ask "which framework?")
- There's an obvious best practice (use parameterized queries → don't ask "should I prevent SQL injection?")
- The user has already specified details in their request

### 6. Business Domain Awareness — Understand the Business Before Writing Code

**Every agent MUST understand the business domain context before implementing, testing, investigating, or reviewing code.** Writing technically correct code that violates business rules is a critical failure.

- **Read business rules** from existing service classes, validators, and domain models before making changes
- **Understand entity lifecycles** — know what states exist and what transitions are valid
- **Respect domain terminology** — use the same business terms the codebase uses (don't rename `CreditLimit` to `MaxCredit`)
- **Map business workflows** — understand the end-to-end business process before touching any part of it
- **Validate business invariants** — ensure changes don't break data consistency rules
- **Reference business context** in code comments, test names, and PR descriptions

When implementing, agents should explain:
- "This validation exists because [business rule]" 
- "I chose this approach because the existing OrderService handles [workflow] in this way"
- "The test covers the scenario where [business condition] triggers [business outcome]"

### 7. Explain Decisions & Report Outcomes — Show Your Reasoning

**Every agent MUST explain its decisions during execution and provide a structured summary when done.** Never make silent decisions — the user should understand WHY each choice was made.

#### During Execution:
- **Before each major action**, briefly state what you're about to do and why:
  > "I'll add the discount calculation in OrderService because this is where existing pricing logic lives (line 45-67)."
- **When choosing between alternatives**, explain the trade-off:
  > "I chose to add a new column instead of a separate table because the data is always accessed together and the existing pattern uses single-table approach."
- **When skipping something**, explain why:
  > "I'm not adding validation here because it's already handled by the @Valid annotation in OrderResource (line 23)."

#### Post-Execution Summary:
After completing any significant task, provide a **structured summary**:

```markdown
## Summary of Changes

### What Was Done
| # | Action | File | Reason |
|---|--------|------|--------|
| 1 | Created entity | Order.java | New entity for order tracking per PBI-123 |
| 2 | Added validation | OrderService.java | Business rule: order total cannot exceed credit limit |
| 3 | Created migration | V2__add_orders.sql | New table with indexes for order queries |

### Business Rules Implemented
- ✅ VIP customers get 15% discount on orders > $100
- ✅ Order cannot be modified after SHIPPED status
- ✅ Credit limit check before order confirmation

### Test Coverage
- 12 unit tests covering all 8 branches in OrderService
- Tests validate: happy path, validation errors, edge cases, concurrent access

### Design Decisions
| Decision | Alternatives Considered | Rationale |
|----------|------------------------|----------|
| Discount in OrderService | Separate DiscountService | Follows existing pricing logic pattern in same class |
| BigDecimal for amounts | Double | Business requirement for exact decimal arithmetic |

### What Was NOT Done (and why)
- Did not add API rate limiting — not in scope for this PBI
- Did not modify CustomerService — validation already handled there
```

## Quick Start

```
# Bootstrap Copilot for a new project
@conductor Analyze this codebase and generate a complete GitHub Copilot configuration

# Investigate a PBI
@investigator Investigate PBI-123: Add discount calculation for VIP customers

# Implementation (auto-detects tech stack via @dev-orchestrator, or use stack-specific agents)
@implementor Implement the discount calculation feature (Java)
@dotnet-implementor Implement the discount feature (C#/.NET)
@python-implementor Implement the discount feature (Python/FastAPI)
@php-implementor Implement the discount feature (PHP/Laravel)

# Write unit tests
@test-specialist Write comprehensive unit tests for OrderService with minimal mocking

# Sequence diagram
@sequence-diagrammer Create a sequence diagram for the order creation flow

# Code review
@code-reviewer Review changes in the feature/discount branch and produce a markdown report

# WireMock
@mock-data-specialist Create WireMock stubs for the payment service integration

# Mobile Implementation
@mobile-implementor Implement the order list screen with offline-first support

# Mobile Tests
@mobile-test-specialist Write comprehensive tests for OrderViewModel with fakes

# Mobile Architecture
@mobile-architect Review the current architecture and suggest improvements

# Full feature implementation (end-to-end, any stack)
@dev-orchestrator Implement PBI-456: Add VIP discount calculation

# Sprint Planning
@sprint-planner Break down PBI-789 into technical tasks with story point estimates

# Refactoring
@refactoring-specialist Refactor OrderService — it's 800 lines, extract business logic

# Pull Request
@pr-manager Generate PR description for current branch changes

# DevContainer Review
@devcontainer-reviewer Review and optimize the devcontainer configuration

# Bootstrap (Prompts)
/bootstrap-copilot
/analyze-project
/learn-codebase
/implement-feature
```

## Available Skills

| Skill | Purpose |
|-------|---------|
| `analyze-codebase` | Deep codebase analysis → structured report |
| `generate-copilot-config` | Full bootstrap pipeline: analyze → generate all config |
| `investigate-pbi` | PBI investigation with as-is/to-be analysis |
| `implement-feature` | Feature implementation across all layers |
| `implement-mobile-feature` | Mobile feature implementation (Android/iOS) |
| `generate-unit-tests` | Unit tests with 100% branch coverage |
| `generate-mobile-tests` | Mobile tests (Android/iOS) |
| `generate-sequence-diagram` | Mermaid sequence diagrams |
| `generate-wiremock` | WireMock stub configurations |
| `generate-adr` | Architecture Decision Records |
| `generate-agentic-workflow` | GitHub Copilot Agentic Workflow automation |
| `review-code-changes` | Code review with structured reports |
| `orchestrate-development` | Full lifecycle development orchestration |
| `sprint-planning` | Sprint planning & PBI decomposition |
| `estimate-effort` | Story point estimation with codebase analysis |
| `conventional-commit` | Conventional commit message generation |
| `generate-pr-description` | Pull request description generation |
| `technical-debt-analysis` | Tech debt assessment & remediation backlog |
| `optimize-devcontainer` | DevContainer optimization & configuration generation |

## Available Prompts

Use `/prompt-name` in VS Code Chat:

| Prompt | Purpose |
|--------|--------|
| `/bootstrap-copilot` | Full bootstrap pipeline: analyze codebase → generate all config |
| `/analyze-project` | Deep codebase analysis → structured report |
| `/learn-codebase` | Learn business domains, workflows, rules, and data flows interactively |
| `/generate-agents` | Generate agents from tech stack detection |
| `/generate-instructions` | Generate coding standard instructions |
| `/generate-skills` | Generate workflow skills |
| `/implement-feature` | Full implementation: analyze → confirm → code → tests → docs |
