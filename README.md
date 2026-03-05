# 🚀 Copilot Bootstrap Toolkit

> An automated system that analyzes any codebase and generates a complete GitHub Copilot configuration — agents, skills, instructions, hooks — optimized for enterprise Java/Jakarta EE/Oracle and Mobile (Android/iOS) projects.

---

## 📋 Overview

Bootstrap Toolkit solves the problem: **Given any codebase, automatically detect and generate a complete, tailored Copilot configuration.**

The toolkit includes:
- **13 custom agents** — each specialized for a developer role (9 Java + 3 Mobile + 1 Orchestrator)
- **13 reusable skills** — automated workflows for common tasks
- **16 instruction files** — coding standards auto-applied by file type
- **1 conductor** — orchestrator that coordinates the entire pipeline

## 🏗️ Architecture

### Processing Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   @codebase-     │────▶│  @instruction-   │────▶│    @agent-       │
│   analyzer       │     │   generator      │     │    generator     │
│  (Analyze)       │     │  (Gen standards) │     │  (Gen agents)    │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              │
│   @quality-      │◀───│   Gen skills,    │◀─────────────┘
│   reviewer       │     │   prompts, hooks │
│  (Validate)      │     └──────────────────┘
└─────────────────┘
```

### Developer Workflow Pipeline

```
Java/Jakarta EE:
PBI/Issue ──▶ @investigator ──▶ @implementor ──▶ @test-specialist ──▶ @code-reviewer
                  │                   │                  │
                  ▼                   ▼                  ▼
           Investigation         Code Changes       Unit Tests
           Report (.md)          + Migrations      (minimal mocks)
                  │
                  ▼
          @sequence-diagrammer ──▶ @mock-data-specialist
          (Mermaid diagrams)       (WireMock stubs)

Mobile (Android/iOS):
PBI/Issue ──▶ @investigator ──▶ @mobile-architect ──▶ @mobile-implementor ──▶ @mobile-test-specialist
                  │                                        │
                  ▼                                        ▼
           Investigation                        Code + Tests
           Report (.md)                       (ViewModel, UI, Data)
                  │
                  ▼
          @sequence-diagrammer ──▶ @code-reviewer
```

## 🧱 Core Principles

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

| Layer | Validates | Examples |
|-------|-----------|----------|
| **REST/Controller** | Input format | `@NotNull`, `@Size`, `@Pattern` |
| **Service** | Business rules | "order total must not exceed credit limit" |
| **Repository/Database** | Data integrity | unique, foreign key, check constraints |

Each layer validates what it owns. Do not re-validate upstream concerns downstream.

### 4. Multi-Module Awareness

In multi-module projects, understand module boundaries before making changes:

- Identify which module owns a given responsibility (validation, transformation, persistence)
- Do not duplicate logic that is already handled by another module
- Respect module APIs — don't bypass a module's public interface to access its internals
- When reviewing code, flag cross-module duplication as a 🔴 Critical issue

## 📁 Directory Structure

```
.github/
├── copilot-instructions.md                          # 📖 Project-wide context
│
├── agents/                                          # 🤖 Custom AI Agents (13)
│   ├── conductor.agent.md                           #   Main orchestrator
│   ├── dev-orchestrator.agent.md                    #   Full lifecycle orchestrator
│   ├── codebase-analyzer.agent.md                   #   Codebase analysis
│   ├── investigator.agent.md                        #   PBI investigation
│   ├── implementor.agent.md                         #   Implementation (Java)
│   ├── test-specialist.agent.md                     #   Unit testing (Java)
│   ├── sequence-diagrammer.agent.md                 #   Sequence diagrams
│   ├── code-reviewer.agent.md                       #   Code review
│   ├── mock-data-specialist.agent.md                #   WireMock/mock data
│   ├── agent-generator.agent.md                     #   Meta: generates config
│   ├── mobile-implementor.agent.md                  #   📱 Mobile implementation
│   ├── mobile-test-specialist.agent.md              #   📱 Mobile testing
│   └── mobile-architect.agent.md                    #   📱 Mobile architecture
│
├── skills/                                          # 🎯 Reusable Skills (12)
│   ├── analyze-codebase/SKILL.md                    #   Deep analysis
│   ├── investigate-pbi/SKILL.md                     #   PBI investigation
│   ├── implement-feature/SKILL.md                   #   Implementation guide
│   ├── generate-unit-tests/SKILL.md                 #   Unit test generation
│   ├── generate-sequence-diagram/SKILL.md           #   Sequence diagrams
│   ├── review-code-changes/SKILL.md                 #   Code review
│   ├── generate-wiremock/SKILL.md                   #   WireMock stubs
│   ├── generate-copilot-config/SKILL.md             #   Full bootstrap
│   ├── implement-mobile-feature/SKILL.md            #   📱 Mobile implementation
│   ├── generate-mobile-tests/SKILL.md               #   📱 Mobile test generation
│   ├── orchestrate-development/SKILL.md             #   Full dev lifecycle
│   ├── generate-adr/SKILL.md                        #   Architecture Decision Records
│   └── generate-hooks/SKILL.md                      #   Copilot hooks generation
│
└── instructions/                                    # 📋 Coding Standards (16)
    ├── java.instructions.md                         #   Java conventions
    ├── jakartaee.instructions.md                     #   Jakarta EE patterns
    ├── maven.instructions.md                        #   Maven POM standards
    ├── oracle-sql.instructions.md                   #   Oracle SQL standards
    ├── testing.instructions.md                      #   Testing standards
    ├── wiremock.instructions.md                     #   WireMock standards
    ├── api-design.instructions.md                   #   REST API design
    ├── security.instructions.md                     #   Security standards
    ├── logging.instructions.md                      #   Logging & observability
    ├── error-handling.instructions.md               #   Error handling patterns
    ├── database-migration.instructions.md           #   DB migration conventions
    ├── kotlin.instructions.md                       #   📱 Kotlin standards
    ├── swift.instructions.md                        #   📱 Swift standards
    ├── android.instructions.md                      #   📱 Android/Compose conventions
    ├── ios.instructions.md                          #   📱 iOS/SwiftUI conventions
    └── gradle.instructions.md                       #   📱 Gradle KTS standards
├── prompts/                                         # 🚀 Reusable Prompts (6)
│   ├── bootstrap-copilot.prompt.md                  #   Full bootstrap pipeline
│   ├── analyze-project.prompt.md                    #   Codebase analysis
│   ├── generate-agents.prompt.md                    #   Generate agents
│   ├── generate-instructions.prompt.md              #   Generate instructions
│   ├── generate-skills.prompt.md                    #   Generate skills
│   └── implement-feature.prompt.md                  #   Full feature implementation
│
└── hooks/                                           # 🔗 Lifecycle Hooks (generated per project)
    └── (auto-generated during bootstrap)
```

## 🤖 Agents List

### Conductor (Main Orchestrator)

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@conductor`** | Coordinates the entire pipeline — bootstrap or developer workflows | Bootstrap a new project, or orchestrate multi-step tasks |

### Dev Orchestrator (Full Lifecycle)

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@dev-orchestrator`** | Full lifecycle: requirement → analyze → confirm → implement → test (100% coverage) → docs | End-to-end feature delivery with tests and documentation |

### Sub-Agents (Specialized)

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@codebase-analyzer`** | Analyzes languages, frameworks, architecture, conventions, domain map | Understanding a new codebase, creating a domain map |
| **`@investigator`** | Investigates PBI: as-is → to-be, scenarios, impact, risk → markdown report | New PBI received, investigate a bug, plan changes |
| **`@implementor`** | Writes production code following project patterns, across all layers | Implement a feature, fix a bug |
| **`@test-specialist`** | Unit tests: minimal mocks, full branch coverage, test builders, <100ms | Write tests, increase coverage |
| **`@sequence-diagrammer`** | Mermaid sequence diagrams with markers 🆕✏️❌ for changes | Create diagrams, document flows |
| **`@code-reviewer`** | Code review: per-file analysis, severity ratings → markdown report | Review PR, check code quality |
| **`@mock-data-specialist`** | WireMock stubs, test fixtures, mock data for local/devcontainer | Create mock data, set up WireMock |
| **`@agent-generator`** | Generates agents/skills/instructions from codebase analysis | Bootstrap Copilot config |

### Mobile Agents 📱

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@mobile-implementor`** | Implementation for Android (Kotlin/Compose) and iOS (Swift/SwiftUI) | Implement mobile feature, fix a bug |
| **`@mobile-test-specialist`** | Mobile tests: JUnit/MockK/Turbine, XCTest/Swift Testing, fakes | Write mobile tests, increase coverage |
| **`@mobile-architect`** | Mobile architecture: MVVM, Clean Architecture, module structure | Review architecture, design modules |

> **Note**: All agents have NO tool restrictions (= they use all available tools including codebase, terminal, edit, fetch, GitHub, MCP servers).

## 🎯 Skills List

| Skill | Description | Trigger Keywords |
|-------|--------|-----------------|
| `analyze-codebase` | Deep analysis: structure, tech stack, domains, conventions | "analyze", "understand codebase", "domain map" |
| `investigate-pbi` | PBI investigation: as-is/to-be, scenarios, impact → markdown | "investigate", "PBI", "impact analysis" |
| `implement-feature` | Implementation guide across all layers | "implement", "create feature", "add endpoint" |
| `generate-unit-tests` | Unit tests: minimal mocks, all branches, builders | "write tests", "unit test", "coverage" |
| `generate-sequence-diagram` | Mermaid diagrams with change markers | "sequence diagram", "flow diagram" |
| `review-code-changes` | Code review: per-file markdown report | "review", "PR review", "check changes" |
| `generate-wiremock` | WireMock stubs from codebase patterns | "wiremock", "mock", "stub", "mock data" |
| `generate-copilot-config` | Full bootstrap pipeline | "bootstrap", "generate config", "setup copilot" |
| `implement-mobile-feature` | Mobile feature implementation across all layers (Android/iOS) | "mobile", "implement screen", "add feature" |
| `generate-mobile-tests` | Mobile tests: fakes, builders, UI tests (Android/iOS) | "mobile tests", "viewmodel test", "compose test" |
| `orchestrate-development` | Full lifecycle: analyze → confirm → implement → test → docs | "end-to-end", "full implementation", "requirement to delivery" |
| `generate-adr` | Architecture Decision Records with alternatives and trade-offs | "ADR", "architecture decision", "design decision" |
| `generate-hooks` | Copilot hooks for auto-format, lint, compile, security gates | "hooks", "auto-format", "lint check", "quality gates" |

## 📋 Instructions List

| File | applyTo | Contents |
|------|---------|----------|
| `java.instructions.md` | `**/*.java` | Naming, null safety, error handling, logging, JavaDoc |
| `jakartaee.instructions.md` | `**/*.java` | CDI, JPA, JAX-RS, Bean Validation, transactions |
| `maven.instructions.md` | `**/pom.xml` | Version management, BOM, plugins, profiles |
| `oracle-sql.instructions.md` | `**/*.sql` | Sequences, indexes, pagination, query optimization |
| `testing.instructions.md` | `**/*Test*.java` | JUnit 5, minimal mocks, branch coverage, builders |
| `wiremock.instructions.md` | `**/wiremock/**/*.json` | Stub format, scenarios, response templating |
| `kotlin.instructions.md` | `**/*.kt` | 📱 Null safety, coroutines, data classes, scope functions |
| `swift.instructions.md` | `**/*.swift` | 📱 Optionals, protocols, async/await, value types |
| `android.instructions.md` | `**/src/main/**/*.kt` | 📱 Compose, ViewModel, Hilt, Room, Navigation |
| `ios.instructions.md` | `**/*.swift` | 📱 SwiftUI, @Observable, SwiftData, URLSession |
| `gradle.instructions.md` | `**/*.gradle.kts` | 📱 Version catalogs, KTS, multi-module, dependencies |
| `api-design.instructions.md` | `**/*Resource*.java,**/*Controller*.java` | REST API design, versioning, pagination, error responses |
| `security.instructions.md` | `**/*.java` | Auth, input validation, SQL injection, secrets, OWASP |
| `logging.instructions.md` | `**/*.java` | Structured logging, log levels, correlation IDs, metrics |
| `error-handling.instructions.md` | `**/*.java` | Exception hierarchy, error codes, retry, circuit breaker |
| `database-migration.instructions.md` | `**/*.sql,**/db/migration/**` | Flyway/Liquibase naming, versioning, rollback, Oracle patterns |

## 🚀 Prompts List

Prompts can be triggered via `/prompt-name` in VS Code Chat:

| Prompt | Description | When to Use |
|--------|-------------|-------------|
| `/bootstrap-copilot` | Full bootstrap: analyze codebase → generate all config | Set up Copilot for a new project |
| `/analyze-project` | Detailed codebase analysis → structured report | Understand project structure |
| `/generate-agents` | Generate agents from detected tech stack | Create agents for a project |
| `/generate-instructions` | Generate coding standards from conventions | Create instruction files |
| `/generate-skills` | Generate skills from detected workflows | Create workflow skills |
| `/implement-feature` | Full implementation: analyze → confirm → code → tests → docs | Implement a feature end-to-end |

## 🚀 Usage

### Quick Start

1. **Copy the `.github/` folder** into your target project:
   ```bash
   cp -r .github/ /path/to/your-project/.github/
   ```

2. **Open the project in VS Code** with GitHub Copilot Chat

3. **Bootstrap**:
   ```
   @conductor Analyze this codebase and generate a complete GitHub Copilot configuration
   ```

4. **Review the output** and adjust as needed

### Developer Daily Workflows

#### 📋 Investigate a PBI

```
@investigator Investigate PBI-123: Add discount feature for VIP customers

Output → investigation-report.md:
- As-Is: current flow analysis
- To-Be: proposed changes
- Scenarios: happy path, errors, edge cases
- Impact: affected modules, DB changes, integrations
- Risks: assessment with mitigation plans
- Checklist: implementation tasks
```

#### 💻 Implementation

```
@implementor Implement the VIP discount feature based on the investigation report

Output → Code changes across layers:
- Entity: DiscountRule.java
- DTO: DiscountRequest/Response.java
- Repository: DiscountRuleRepository.java
- Service: DiscountService.java
- Resource: DiscountResource.java
- Migration: V5__add_discount_rules.sql
```

#### 🧪 Unit Tests

```
@test-specialist Write comprehensive unit tests for DiscountService

Output → DiscountServiceTest.java:
- @Nested groups per method
- Real objects for mappers/validators (no unnecessary mocks)
- Test builders for DiscountRule, Customer
- All branches covered (VIP/Regular, above/below threshold, null cases)
- AssertJ assertions, <100ms per test
```

#### 📊 Sequence Diagram

```
@sequence-diagrammer Create a to-be sequence diagram for the discount calculation flow

Output → Mermaid diagram with:
- All participants (Resource → Service → Repository → Oracle DB)
- 🆕 markers for new components
- ✏️ markers for modified interactions
- Green/yellow rect blocks highlighting changes
```

#### 👀 Code Review

```
@code-reviewer Review the changes in feature/vip-discount branch

Output → code-review-report.md:
- Per-file tables with severity (🔴🟡🔵🟢)
- Code snippets with suggestions
- Missing test coverage
- Overall assessment (✅/⚠️/❌)
```

#### 🔌 WireMock

```
@mock-data-specialist Create WireMock stubs for the pricing service integration

Output → WireMock files:
- mappings/pricing-service/get-price-success.json
- mappings/pricing-service/get-price-not-found.json
- mappings/pricing-service/get-price-timeout.json
- __files/pricing-service/price-response.json
```

#### 📱 Mobile Implementation (Android)

```
@mobile-implementor Implement the order list screen with offline-first support

Output → Code changes across layers:
- Data: OrderDto.kt, OrderEntity.kt, OrderDao.kt, OrderApiService.kt
- Domain: Order.kt, OrderRepository.kt, GetOrdersUseCase.kt
- Presentation: OrderListUiState.kt, OrderListViewModel.kt, OrderListScreen.kt
- DI: OrderModule.kt (Hilt)
- Navigation: Route registration
```

#### 📱 Mobile Implementation (iOS)

```
@mobile-implementor Implement the order list screen with SwiftUI

Output → Code changes across layers:
- Data: OrderDTO.swift, OrderRepository.swift, OrderAPIService.swift
- Domain: Order.swift, OrderRepositoryProtocol.swift, GetOrdersUseCase.swift
- Presentation: OrderListViewModel.swift, OrderListView.swift
- Navigation: AppRoute enum update
```

#### 📱 Mobile Tests

```
@mobile-test-specialist Write comprehensive tests for OrderViewModel with fakes

Output (Android):
- FakeOrderRepository.kt (in-memory, configurable)
- OrderBuilder.kt (test builder)
- MainDispatcherExtension.kt (coroutine test setup)
- OrderViewModelTest.kt (Turbine + JUnit 5, all branches)

Output (iOS):
- FakeOrderRepository.swift
- OrderBuilder.swift / Order+Stub.swift
- OrderViewModelTests.swift (Swift Testing @Suite)
```

#### 📱 Architecture Review

```
@mobile-architect Review the current architecture and suggest improvements

Output → architecture-assessment.md:
- Current architecture analysis
- Anti-patterns detected
- Recommendations with effort estimates
- Module dependency diagram (Mermaid)
- Migration plan
```

#### 🚀 Full Feature Delivery (End-to-End)

```
@dev-orchestrator Implement PBI-456: Add VIP discount calculation

Workflow:
1. Parse requirement → extract scope, constraints, acceptance criteria
2. Investigate → as-is analysis, to-be design, scenarios, impact, risks
3. Present findings → wait for user confirmation ⬸️
4. Implement → production code across all layers
5. Write tests → 100% branch coverage, minimal mocking, test builders
6. Generate docs → markdown report with changes, API, coverage
7. Summary → deliverables report with verification command
```

## 🏢 Strategy for Large Codebases (Multi-Domain)

### The Problem

With large codebases having many domains, agents need to find relevant information as quickly as possible.

### Solution: Domain Mapping + Layered Instructions

1. **Phase 1 — Domain Map**: `@codebase-analyzer` creates a domain map:
   ```
   com.company.project/
   ├── orders/          → Order domain (REST API, JPA, Oracle)
   ├── customers/       → Customer domain (REST API, JPA, Oracle)
   ├── payments/        → Payment domain (JMS, External API)
   ├── common/          → Shared utilities, base classes
   └── infrastructure/  → Cross-cutting: auth, logging, config
   ```

2. **Phase 2 — Layered Instructions**:
   - **Global**: `copilot-instructions.md` → project overview, build commands
   - **Language**: `java.instructions.md` → applyTo `**/*.java`
   - **Framework**: `jakartaee.instructions.md` → applyTo `**/*.java`
   - **Domain**: `orders.instructions.md` → applyTo `**/orders/**/*.java`
   - **Testing**: `testing.instructions.md` → applyTo `**/*Test*.java`

3. **Phase 3 — Cross-Reference Keywords**: Each agent/skill description contains domain keywords for Copilot auto-discovery:
   ```
   description: '...orders, customers, payments, pricing, inventory...'
   ```

4. **Phase 4 — Agent Context**: Each agent knows the domain map and can:
   - Quickly find related code across domains
   - Understand dependencies between domains
   - Avoid creating duplicate code across domains

### Example: Generating Per-Domain Instructions

When `@conductor` bootstraps a large project, it will also create:
```
instructions/
├── orders.instructions.md        # applyTo: **/orders/**
├── customers.instructions.md     # applyTo: **/customers/**
├── payments.instructions.md      # applyTo: **/payments/**
└── common.instructions.md        # applyTo: **/common/**
```

Each file contains domain-specific patterns, entities, and business rules.

## 🔧 Customization

### Adding a New Agent

Create `.github/agents/[name].agent.md`:

```markdown
---
name: 'My Custom Agent'
description: 'Clear description of expertise and when to use this agent.'
---

You are a [role] expert specializing in [domain].
...
```

> No need to declare `tools` — by default agents can use all available tools.

### Adding a New Skill

Create `.github/skills/[name]/SKILL.md`:

```markdown
---
name: my-skill-name
description: 'WHAT it does + WHEN to use it + KEYWORDS. 10-1024 chars.'
---

# Skill Title
## When to Use
## Workflow
### Step 1: ...
## Validation
```

### Adding a New Instruction

Create `.github/instructions/[name].instructions.md`:

```markdown
---
description: 'Description of these coding standards.'
applyTo: '**/*.java'
---

# Standards
...
```

### Adding a New Hook

Create `.github/hooks/[hook-name].json`:

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "your-unix-command",
        "powershell": "your-windows-command",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

Available events: `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `agentStop`, `subagentStop`, `errorOccurred`.

> **Tip**: Non-zero exit code blocks the action — use `preToolUse` for security gates. Keep `postToolUse` hooks fast (< 30s).

## 🧠 Concepts

### Agents vs Skills vs Instructions

| Concept | Purpose | When Active | How to Invoke |
|---------|---------|-------------|---------------|
| **Agent** | Specialized AI persona | User calls `@agent-name` | `@conductor ...` |
| **Skill** | Automated task workflow | Auto-discovered via description, or user uses `/command` | Auto-discovery |
| **Instruction** | Coding standards | Auto-applied when file matches `applyTo` pattern | Automatic |
| **Hook** | Lifecycle automation | Runs shell commands at agent session events (format, lint, compile) | Automatic |

### Tools Available

Agents can use all of the user's tools:
- **codebase** — read/search files in the workspace
- **terminal** — run shell commands (mvn, git, docker, etc.)
- **edit** — create/modify files
- **fetch** — retrieve content from URLs
- **github** — interact with GitHub API
- **MCP servers** — any MCP server the user has configured

### Mocking Philosophy

Priority order for tests:
```
Real Objects > Test Builders > Fakes > Stubs > Mocks > Reflection
     ✅           ✅            ✅      ⚠️      ⚠️       ❌ (last resort)
```

- **Real objects**: Use for mappers, validators, converters
- **Test builders**: Builder pattern for entities/DTOs used in tests
- **Fakes**: In-memory implementations for repositories
- **Stubs**: Simple return-value mocks for external dependencies
- **Mocks with verify**: Only when interaction verification is needed
- **Reflection**: Only when a private method MUST be tested and cannot be refactored

## 📄 License

MIT
