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

# Bootstrap (Prompts)
/bootstrap-copilot
/analyze-project
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

## Available Prompts

Use `/prompt-name` in VS Code Chat:

| Prompt | Purpose |
|--------|--------|
| `/bootstrap-copilot` | Full bootstrap pipeline: analyze codebase → generate all config |
| `/analyze-project` | Deep codebase analysis → structured report |
| `/generate-agents` | Generate agents from tech stack detection |
| `/generate-instructions` | Generate coding standard instructions |
| `/generate-skills` | Generate workflow skills |
| `/implement-feature` | Full implementation: analyze → confirm → code → tests → docs |
