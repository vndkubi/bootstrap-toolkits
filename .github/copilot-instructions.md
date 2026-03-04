# Copilot Bootstrap Toolkit

An automated system that analyzes any codebase and generates a complete GitHub Copilot configuration — including custom agents, skills, instructions, hooks, and domain context.

## Overview

Bootstrap Toolkit contains a **conductor agent** that orchestrates specialized sub-agents through a pipeline:

```
Analyze → Generate Instructions → Generate Agents → Generate Skills → Generate Prompts → Validate
```

Each sub-agent is an expert in its own domain, designed for enterprise Java/Jakarta EE/Oracle projects but extensible to any tech stack.

## Available Agents

| Agent | Purpose |
|-------|---------|
| `@conductor` | Main orchestrator — coordinates the entire bootstrap pipeline and developer workflows |
| `@codebase-analyzer` | Analyzes codebase: languages, frameworks, architecture, conventions, domain map |
| `@investigator` | Investigates PBIs: as-is/to-be, scenarios, impact analysis, risk assessment → markdown |
| `@implementor` | Implementation: writes code following project patterns, across all layers |
| `@test-specialist` | Unit tests: minimal mocks, full branch coverage, test builders, JUnit 5 |
| `@sequence-diagrammer` | Mermaid sequence diagrams: trace flows, mark changes with 🆕✏️❌ |
| `@code-reviewer` | Code review: per-file analysis → structured markdown with severity ratings |
| `@mock-data-specialist` | WireMock stubs, test fixtures, mock data for local/devcontainer |
| `@agent-generator` | Meta-agent: generates agents/skills/instructions from codebase analysis |
| `@mobile-implementor` | Mobile implementation: Android (Kotlin/Compose) and iOS (Swift/SwiftUI) |
| `@mobile-test-specialist` | Mobile tests: JUnit/MockK/Turbine (Android), XCTest/Swift Testing (iOS) |
| `@mobile-architect` | Mobile architecture: MVVM, Clean Architecture, module structure |
| `@dev-orchestrator` | Full lifecycle: requirement → analyze → confirm → implement → test (100% branch coverage) → documentation |

## Primary Focus

- **Java Enterprise**: Java, Maven, Jakarta EE, Oracle
- **Mobile**: Android (Kotlin, Jetpack Compose, Hilt, Room), iOS (Swift, SwiftUI, async/await)

Agents can analyze and generate config for any tech stack.

## Quick Start

```
# Bootstrap Copilot for a new project
@conductor Analyze this codebase and generate a complete GitHub Copilot configuration

# Investigate a PBI
@investigator Investigate PBI-123: Add discount calculation for VIP customers

# Implementation
@implementor Implement the discount calculation feature based on the investigation report

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

# Full feature implementation
@dev-orchestrator Implement PBI-456: Add VIP discount calculation

# Bootstrap (Prompts)
/bootstrap-copilot
/analyze-project
/implement-feature
```

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
