# 🚀 Copilot Bootstrap Toolkit

> An automated system that analyzes any codebase and generates a complete GitHub Copilot configuration — agents, skills, instructions, hooks, agentic workflows — supporting Java, .NET, Python, PHP, TypeScript/React, and Mobile (Android/iOS) projects. Designed for senior developers in agile teams working on enterprise-scale projects (20-100+ modules).

---

## 📋 Overview

Bootstrap Toolkit solves the problem: **Given any codebase, automatically detect and generate a complete, tailored Copilot configuration.**

The toolkit includes:
- **23 custom agents** — specialized for every developer role across 7 tech stacks + agile workflows + devcontainer optimization
- **26 reusable skills** — automated workflows from sprint planning to impact analysis
- **23 instruction files** — coding standards auto-applied by file type for Java, .NET, Python, PHP, TypeScript, React, Kotlin, Swift, DevContainer
- **1 conductor** — master orchestrator that coordinates the entire pipeline
- **Enterprise-ready** — domain-scoped instructions, context budget management, cross-module impact analysis
- **Agentic workflow** support — generate autonomous GitHub Actions-based AI workflows

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
Any Tech Stack (Java/.NET/Python/PHP):
PBI/Issue ──▶ @investigator ──▶ @[stack]-implementor ──▶ @test-specialist ──▶ @code-reviewer
                  │                      │                       │
                  ▼                      ▼                       ▼
           Investigation            Code Changes            Unit Tests
           Report (.md)            + Migrations            (minimal mocks)
                  │
                  ├──▶ @sequence-diagrammer ──▶ @mock-data-specialist
                  │    (Mermaid diagrams)       (WireMock stubs)
                  │
                  └──▶ @sprint-planner ──▶ @pr-manager
                       (Estimation)          (PR lifecycle)

Mobile (Android/iOS):
PBI/Issue ──▶ @investigator ──▶ @mobile-architect ──▶ @mobile-implementor ──▶ @mobile-test-specialist
                  │                                        │
                  ▼                                        ▼
           Investigation                        Code + Tests
           Report (.md)                       (ViewModel, UI, Data)
                  │
                  ▼
          @sequence-diagrammer ──▶ @code-reviewer

Full Lifecycle (The "Do Everything" Pipeline):
PBI/Issue ──▶ @dev-orchestrator ──▶ [auto-detects stack] ──▶ investigate → confirm → implement → test → PR → docs
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

### 5. Clarify Before Acting — Ask the Right Questions First

**Every agent MUST ask clarifying questions when the user's request lacks sufficient detail.** Do not guess or make assumptions about business logic, scope, constraints, or preferences. Each agent has domain-specific questions built-in and will ask them in the chat session before proceeding.

- Compose domain-specific questions and wait for answers before proceeding
- Batch related questions (max 3-5 at a time) — don't overwhelm
- Provide sensible defaults when possible
- Skip obvious questions the codebase already answers
- Confirm understanding before major actions

## 📁 Directory Structure

```
.github/
├── copilot-instructions.md                          # 📖 Project-wide context
│
├── agents/                                          # 🤖 Custom AI Agents (20)
│   ├── conductor.agent.md                           #   Main orchestrator
│   ├── dev-orchestrator.agent.md                    #   Full lifecycle orchestrator (multi-stack)
│   ├── codebase-analyzer.agent.md                   #   Codebase analysis
│   ├── investigator.agent.md                        #   PBI investigation
│   ├── implementor.agent.md                         #   Implementation (Java/Jakarta EE)
│   ├── dotnet-implementor.agent.md                  #   Implementation (.NET/C#)
│   ├── python-implementor.agent.md                  #   Implementation (Python/Django/FastAPI)
│   ├── php-implementor.agent.md                     #   Implementation (PHP/Laravel/Symfony)
│   ├── test-specialist.agent.md                     #   Unit testing (Java)
│   ├── sequence-diagrammer.agent.md                 #   Sequence diagrams
│   ├── code-reviewer.agent.md                       #   Code review
│   ├── mock-data-specialist.agent.md                #   WireMock/mock data
│   ├── agent-generator.agent.md                     #   Meta: generates config
│   ├── mobile-implementor.agent.md                  #   📱 Mobile implementation
│   ├── mobile-test-specialist.agent.md              #   📱 Mobile testing
│   ├── mobile-architect.agent.md                    #   📱 Mobile architecture
│   ├── sprint-planner.agent.md                      #   📊 Sprint planning & estimation
│   ├── refactoring-specialist.agent.md              #   ♻️ Refactoring & tech debt
│   ├── pr-manager.agent.md                          #   🔀 PR lifecycle management
│   ├── devcontainer-reviewer.agent.md               #   🐳 DevContainer review & optimization
│   ├── frontend-implementor.agent.md                #   🌐 Frontend (TypeScript/React/Vue/Angular)
│   ├── dependency-analyzer.agent.md                 #   🔗 Cross-module dependency analysis
│   └── database-specialist.agent.md                 #   🗄️ Schema review & migration strategy
│
├── skills/                                          # 🎯 Reusable Skills (20)
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
│   ├── generate-hooks/SKILL.md                      #   Copilot hooks generation
│   ├── generate-agentic-workflow/SKILL.md           #   🤖 Agentic workflow automation
│   ├── sprint-planning/SKILL.md                     #   📊 Sprint planning workflow
│   ├── estimate-effort/SKILL.md                     #   📊 Story point estimation
│   ├── conventional-commit/SKILL.md                 #   💬 Conventional commits
│   ├── generate-pr-description/SKILL.md             #   🔀 PR description generation
│   ├── technical-debt-analysis/SKILL.md             #   🏗️ Tech debt analysis
│   ├── optimize-devcontainer/SKILL.md               #   🐳 DevContainer optimization
│   ├── core-principles/SKILL.md                     #   📐 Core engineering principles
│   ├── learn-codebase/SKILL.md                      #   🎓 Codebase learning workflow
│   ├── domain-registry/SKILL.md                     #   🏢 Enterprise domain auto-detection
│   ├── context-budget-check/SKILL.md                #   📏 Context budget validation
│   ├── impact-analysis/SKILL.md                     #   💥 Cross-module impact analysis
│   └── generate-domain-instructions/SKILL.md        #   📑 Per-domain instruction generation
│
├── instructions/                                    # 📋 Coding Standards (20)
│   ├── java.instructions.md                         #   Java conventions
│   ├── jakartaee.instructions.md                    #   Jakarta EE patterns
│   ├── maven.instructions.md                        #   Maven POM standards
│   ├── oracle-sql.instructions.md                   #   Oracle SQL standards
│   ├── testing.instructions.md                      #   Testing standards (Java)
│   ├── wiremock.instructions.md                     #   WireMock standards
│   ├── api-design.instructions.md                   #   REST API design
│   ├── security.instructions.md                     #   Security standards
│   ├── logging.instructions.md                      #   Logging & observability
│   ├── error-handling.instructions.md               #   Error handling patterns
│   ├── database-migration.instructions.md           #   DB migration conventions
│   ├── kotlin.instructions.md                       #   📱 Kotlin standards
│   ├── swift.instructions.md                        #   📱 Swift standards
│   ├── android.instructions.md                      #   📱 Android/Compose conventions
│   ├── ios.instructions.md                          #   📱 iOS/SwiftUI conventions
│   ├── gradle.instructions.md                       #   📱 Gradle KTS standards
│   ├── dotnet.instructions.md                       #   🟣 .NET/C# conventions
│   ├── php.instructions.md                          #   🐘 PHP/Laravel/Symfony standards
│   ├── python.instructions.md                       #   🐍 Python/Django/FastAPI standards
│   ├── devcontainer.instructions.md                 #   🐳 DevContainer configuration standards
│   ├── typescript.instructions.md                   #   🔷 TypeScript strict mode & type safety
│   ├── react.instructions.md                        #   ⚛️ React/Next.js component standards
│   └── module-boundaries.instructions.md            #   🏗️ Cross-module dependency rules
│
├── prompts/                                         # 🚀 Reusable Prompts (7)
│   ├── bootstrap-copilot.prompt.md                  #   Full bootstrap pipeline
│   ├── analyze-project.prompt.md                    #   Codebase analysis
│   ├── learn-codebase.prompt.md                     #   🎓 Learn business & workflows
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
| **`@conductor`** | Coordinates the entire pipeline — bootstrap or developer workflows. Auto-detects tech stack and routes to the right implementor. | Bootstrap a new project, or orchestrate multi-step tasks |

### Dev Orchestrator (Full Lifecycle — The Star Agent ⭐)

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@dev-orchestrator`** | Full lifecycle: requirement → investigate → estimate → confirm → implement → test (100% coverage) → PR description → docs. Multi-stack. | End-to-end feature delivery — "just give me the PBI" |

### Implementation Agents (Stack-Specific)

| Agent | Stack | When to Use |
|-------|-------|-------------|
| **`@implementor`** | Java/Jakarta EE/Spring Boot | Java enterprise projects |
| **`@dotnet-implementor`** | .NET/C#/ASP.NET Core/EF Core | .NET projects with Clean Architecture |
| **`@python-implementor`** | Python/Django/FastAPI/SQLAlchemy | Python web services |
| **`@php-implementor`** | PHP/Laravel/Symfony/Eloquent/Doctrine | PHP web applications |
| **`@frontend-implementor`** | TypeScript/React/Vue/Angular/Next.js | Frontend web applications |

### Analysis & Quality Agents

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@codebase-analyzer`** | Deep analysis: languages, frameworks, architecture, conventions, domain map | Understanding a new codebase |
| **`@investigator`** | PBI investigation: as-is → to-be, scenarios, impact, risk → markdown report | Investigate a PBI, bug, or performance issue |
| **`@test-specialist`** | Unit tests: minimal mocks, full branch coverage, test builders, <100ms | Write tests, increase coverage |
| **`@sequence-diagrammer`** | Mermaid sequence diagrams with markers 🆕✏️❌ for changes | Create diagrams, document flows |
| **`@code-reviewer`** | Code review: per-file analysis, severity ratings → markdown report | Review PR, check code quality |
| **`@mock-data-specialist`** | WireMock stubs, test fixtures, mock data for local/devcontainer | Create mock data, set up WireMock |
| **`@agent-generator`** | Generates agents/skills/instructions from codebase analysis | Bootstrap Copilot config |

### Enterprise Agents 🏢

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@dependency-analyzer`** | Cross-module dependency analysis, impact assessment, blast radius | Assess change impact, audit dependencies, detect circular deps |
| **`@database-specialist`** | Schema review, migration strategy, query optimization, multi-schema | Database design, migration planning, performance tuning |

### Mobile Agents 📱

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@mobile-implementor`** | Implementation for Android (Kotlin/Compose) and iOS (Swift/SwiftUI) | Implement mobile feature, fix a bug |
| **`@mobile-test-specialist`** | Mobile tests: JUnit/MockK/Turbine, XCTest/Swift Testing, fakes | Write mobile tests, increase coverage |
| **`@mobile-architect`** | Mobile architecture: MVVM, Clean Architecture, module structure | Review architecture, design modules |

### Agile & Workflow Agents 📊

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@sprint-planner`** | Sprint planning: PBI decomposition, story point estimation, dependency mapping, capacity planning, risk assessment | Sprint planning sessions, backlog grooming |
| **`@refactoring-specialist`** | Safe refactoring: code smell detection, behavior-preserving changes, before/after metrics, tech debt tracking | Refactor a class, reduce tech debt |
| **`@pr-manager`** | PR lifecycle: description generation, review readiness, merge strategy, changelog | Create PR, improve PR description |

### DevContainer & Infrastructure Agents 🐳

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **`@devcontainer-reviewer`** | DevContainer review: optimize performance, security, DX, generate configs for any stack | Review devcontainer, improve startup, create devcontainer config |

> **Note**: All agents use all available tools — codebase, terminal, edit, fetch, GitHub, MCP servers.

## 🎯 Skills List

### Core Development Skills

| Skill | Description | Trigger Keywords |
|-------|--------|-----------------|
| `analyze-codebase` | Deep analysis: structure, tech stack, domains, conventions | "analyze", "understand codebase", "domain map" |
| `investigate-pbi` | PBI investigation: as-is/to-be, scenarios, impact → markdown | "investigate", "PBI", "impact analysis" |
| `implement-feature` | Implementation guide across all layers (any stack) | "implement", "create feature", "add endpoint" |
| `generate-unit-tests` | Unit tests: minimal mocks, all branches, builders | "write tests", "unit test", "coverage" |
| `generate-sequence-diagram` | Mermaid diagrams with change markers | "sequence diagram", "flow diagram" |
| `review-code-changes` | Code review: per-file markdown report | "review", "PR review", "check changes" |
| `generate-wiremock` | WireMock stubs from codebase patterns | "wiremock", "mock", "stub", "mock data" |
| `generate-copilot-config` | Full bootstrap pipeline | "bootstrap", "generate config", "setup copilot" |
| `generate-adr` | Architecture Decision Records | "ADR", "architecture decision" |
| `generate-hooks` | Copilot hooks for quality automation | "hooks", "auto-format", "lint check" |

### Mobile Skills 📱

| Skill | Description | Trigger Keywords |
|-------|--------|-----------------|
| `implement-mobile-feature` | Mobile feature implementation across all layers (Android/iOS) | "mobile", "implement screen", "add feature" |
| `generate-mobile-tests` | Mobile tests: fakes, builders, UI tests (Android/iOS) | "mobile tests", "viewmodel test", "compose test" |

### Agile & Workflow Skills 📊

| Skill | Description | Trigger Keywords |
|-------|--------|-----------------|
| `orchestrate-development` | Full lifecycle: analyze → confirm → implement → test → PR → docs | "end-to-end", "full implementation", "delivery" |
| `sprint-planning` | Sprint planning: PBI decomposition, task breakdown, sprint backlog | "sprint planning", "break down", "decompose", "sprint" |
| `estimate-effort` | Story point estimation calibrated against codebase complexity | "estimate", "how long", "story points", "effort" |
| `conventional-commit` | Conventional commit messages from staged changes | "commit", "commit message" |
| `generate-pr-description` | PR description with impact analysis and review checklist | "PR description", "pull request", "create PR" |
| `technical-debt-analysis` | Tech debt assessment with prioritized remediation backlog | "tech debt", "code quality", "code smells" |
| `generate-agentic-workflow` | GitHub Copilot Agentic Workflow automation (`.md` → Actions) | "agentic workflow", "automate", "scheduled" |
| `optimize-devcontainer` | DevContainer analysis, optimization, and config generation | "devcontainer", "optimize container", "docker", "startup" |

### Enterprise Skills 🏢

| Skill | Description | Trigger Keywords |
|-------|--------|-----------------|
| `core-principles` | 7 core engineering principles all agents follow | "principles", "core rules" |
| `learn-codebase` | Interactive codebase learning: domains, workflows, rules | "learn", "onboard", "understand codebase" |
| `domain-registry` | Auto-detect and register business domains from source | "domain registry", "domain map" |
| `context-budget-check` | Validate config file sizes and co-loading budgets | "check budget", "validate sizes" |
| `impact-analysis` | Cross-module blast radius analysis | "impact", "blast radius", "what breaks" |
| `generate-domain-instructions` | Generate per-domain .instructions.md files | "domain instructions" |

## 📋 Instructions List

### Java & Enterprise

| File | applyTo | Contents |
|------|---------|----------|
| `java.instructions.md` | `**/*.java` | Naming, null safety, error handling, logging, JavaDoc |
| `jakartaee.instructions.md` | `**/*.java` | CDI, JPA, JAX-RS, Bean Validation, transactions |
| `maven.instructions.md` | `**/pom.xml` | Version management, BOM, plugins, profiles |
| `oracle-sql.instructions.md` | `**/*.sql` | Sequences, indexes, pagination, query optimization |
| `testing.instructions.md` | `**/*Test*.java` | JUnit 5, minimal mocks, branch coverage, builders |
| `wiremock.instructions.md` | `**/wiremock/**/*.json` | Stub format, scenarios, response templating |
| `api-design.instructions.md` | `**/*Resource*,**/*Controller*` | REST API design, versioning, pagination, errors |
| `security.instructions.md` | `**/*.java` | Auth, input validation, SQL injection, OWASP |
| `logging.instructions.md` | `**/*.java` | Structured logging, log levels, correlation IDs |
| `error-handling.instructions.md` | `**/*.java` | Exception hierarchy, error codes, retry, circuit breaker |
| `database-migration.instructions.md` | `**/*.sql,**/db/migration/**` | Flyway/Liquibase naming, versioning, rollback |

### .NET / C# 🟣

| File | applyTo | Contents |
|------|---------|----------|
| `dotnet.instructions.md` | `**/*.cs, **/*.csproj, **/*.razor` | ASP.NET Core, EF Core, DI, middleware, Clean Architecture |

### Python 🐍

| File | applyTo | Contents |
|------|---------|----------|
| `python.instructions.md` | `**/*.py, **/pyproject.toml` | Django/FastAPI, SQLAlchemy, Pydantic, pytest, PEP compliance |

### TypeScript & React 🔷

| File | applyTo | Contents |
|------|---------|----------|
| `typescript.instructions.md` | `**/*.ts, **/*.tsx` | Strict mode, no `any`, discriminated unions, generics, null safety |
| `react.instructions.md` | `**/*.tsx, **/*.jsx` | Functional components, hooks, state management, React Testing Library |

### PHP 🐘

| File | applyTo | Contents |
|------|---------|----------|
| `php.instructions.md` | `**/*.php, **/composer.json` | Laravel/Symfony, Eloquent/Doctrine, PSR-12, PHP 8.x |

### DevContainer 🐳

| File | applyTo | Contents |
|------|---------|----------|
| `devcontainer.instructions.md` | `**/.devcontainer/**, **/devcontainer.json` | Image selection, Features, lifecycle scripts, volumes, security, performance |

### Enterprise 🏢

| File | applyTo | Contents |
|------|---------|----------|
| `module-boundaries.instructions.md` | `**/pom.xml, **/build.gradle*` | Cross-module dependency rules, API boundary conventions, circular dep prevention |

### Mobile 📱

| File | applyTo | Contents |
|------|---------|----------|
| `kotlin.instructions.md` | `**/*.kt` | Null safety, coroutines, data classes, scope functions |
| `swift.instructions.md` | `**/*.swift` | Optionals, protocols, async/await, value types |
| `android.instructions.md` | `**/src/main/**/*.kt` | Compose, ViewModel, Hilt, Room, Navigation |
| `ios.instructions.md` | `**/*.swift` | SwiftUI, @Observable, SwiftData, URLSession |
| `gradle.instructions.md` | `**/*.gradle.kts` | Version catalogs, KTS, multi-module, dependencies |

## 🚀 Prompts List

Prompts can be triggered via `/prompt-name` in VS Code Chat:

| Prompt | Description | When to Use |
|--------|-------------|-------------|
| `/bootstrap-copilot` | Full bootstrap: analyze codebase → generate all config | Set up Copilot for a new project |
| `/analyze-project` | Detailed codebase analysis → structured report | Understand project structure |
| `/learn-codebase` | Learn business domains, workflows, rules, data model interactively | Onboarding, understand business logic, learn workflows |
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

### 📦 Bootstrapping a Brand New Project (From Scratch)

If you have a **new, empty project** (or one that just started and has no Copilot config yet), here's how to use Bootstrap Toolkit step by step.

#### Prerequisites

- **VS Code** with [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension installed
- A Git repository (even if it's empty or has just a few files)
- Basic project structure exists — at minimum a `pom.xml`, `build.gradle.kts`, `*.csproj`, `composer.json`, `pyproject.toml`, or any framework entry point

#### Step 1: Copy Bootstrap Toolkit into Your Project

```bash
# Clone or download copilot-bootstrap
git clone https://github.com/your-org/copilot-bootstrap.git

# Copy the .github/ folder into your target project
cp -r copilot-bootstrap/.github/ /path/to/your-new-project/.github/
```

Your project structure will now look like:
```
your-new-project/
├── .github/
│   ├── copilot-instructions.md
│   ├── agents/          # 20 agents
│   ├── skills/          # 20 skills
│   ├── instructions/    # 20 instruction files
│   └── prompts/         # 7 prompts
├── src/                 # (your code, even if minimal)
├── pom.xml              # (or build.gradle.kts, *.csproj, etc.)
└── README.md
```

#### Step 2: Open in VS Code and Run Bootstrap

Open the project in VS Code, then in Copilot Chat:

```
@conductor Analyze this codebase and generate a complete GitHub Copilot configuration
```

The conductor will:
1. **Detect your tech stack** — languages, frameworks, build tools, databases
2. **Analyze architecture** — module structure, layers, patterns, conventions
3. **Generate tailored `copilot-instructions.md`** — project-specific context, build commands, domain knowledge
4. **Create domain-specific instructions** — coding standards matched to your detected stack
5. **Suggest agent configuration** — which agents are most relevant for your project
6. **Generate hooks** — auto-format, lint, compile checks matched to your tooling

> **Tip**: Even if your project only has a `pom.xml` and one Java class, the analyzer will detect Java/Maven and generate the appropriate configuration. The more code you have, the more tailored the output.

#### Step 3: Customize the Generated Config

After bootstrap, review and adjust:

| File | What to Customize |
|------|-------------------|
| `copilot-instructions.md` | Add business domain context, team conventions, deployment info |
| `instructions/*.instructions.md` | Remove instruction files for stacks you don't use |
| `agents/*.agent.md` | Remove agents for stacks you don't need |

**For a Java/Jakarta EE project**, you might keep:
- `java.instructions.md`, `jakartaee.instructions.md`, `maven.instructions.md`, `oracle-sql.instructions.md`
- `@implementor`, `@test-specialist`, `@investigator`, `@code-reviewer`
- Remove: `dotnet.instructions.md`, `php.instructions.md`, `python.instructions.md`, mobile agents

**For a .NET project**, you might keep:
- `dotnet.instructions.md`
- `@dotnet-implementor`, `@code-reviewer`, `@investigator`
- Remove: Java, PHP, Python, mobile-related files

**For a mobile project (Android + iOS)**, keep:
- `kotlin.instructions.md`, `swift.instructions.md`, `android.instructions.md`, `ios.instructions.md`, `gradle.instructions.md`
- `@mobile-implementor`, `@mobile-test-specialist`, `@mobile-architect`

#### Step 4: Start Using Agents

Now use the agents for daily development:

```
# Investigate a requirement
@investigator Investigate: Add user authentication with JWT

# Implement the feature
@implementor Implement JWT authentication based on the investigation

# Write tests
@test-specialist Write unit tests for AuthService

# Review your changes
@code-reviewer Review the changes I just made

# Create PR
@pr-manager Generate PR description for current branch
```

#### What If My Project Is Completely Empty?

If you literally have zero code (just an empty folder):

1. **Tell the conductor what you're building**:
   ```
   @conductor I'm starting a new Java/Jakarta EE project with Oracle database.
   Generate a Copilot configuration for this stack.
   ```

2. **Use the prompt to generate stack-specific config**:
   ```
   /bootstrap-copilot
   ```
   This will ask you questions about your tech stack and generate config accordingly.

3. **Use the implementor to scaffold initial code**:
   ```
   @implementor Create the initial project structure for a Jakarta EE REST API
   with JPA entities, CDI services, and Flyway migrations
   ```

### 🎯 Use Cases

#### Use Case 1: Greenfield Java Enterprise Project

**Scenario**: You're starting a new Jakarta EE project and want Copilot configured from day one.

```bash
# 1. Create project (Maven archetype, Spring Initializr, or manual)
mvn archetype:generate -DgroupId=com.company -DartifactId=my-app

# 2. Copy bootstrap toolkit
cp -r copilot-bootstrap/.github/ my-app/.github/

# 3. Open in VS Code
code my-app
```

```
# 4. Bootstrap with stack hint
@conductor This is a Jakarta EE project with Maven, JPA, Oracle DB.
Generate Copilot config for this stack.

# 5. Start implementing
@investigator Investigate: Design the Order management domain
@implementor Create Order entity, OrderService, OrderResource with CRUD operations
@test-specialist Write tests for OrderService
```

#### Use Case 2: Adding Copilot to an Existing Large Codebase

**Scenario**: You have a 100K+ LoC project and want Copilot to understand it.

```
# Full analysis — the analyzer will map all domains, patterns, and conventions
@conductor Analyze this codebase and generate a complete GitHub Copilot configuration
```

The conductor will:
- Map all domains (orders, customers, payments, etc.)
- Detect coding conventions (naming, patterns, error handling)
- Generate per-domain instructions if the codebase is large
- Create `copilot-instructions.md` with project-specific context

#### Use Case 3: Mobile Project (Android + iOS)

**Scenario**: Building a native mobile app with Kotlin/Compose and Swift/SwiftUI.

```bash
# Copy bootstrap toolkit
cp -r copilot-bootstrap/.github/ my-mobile-app/.github/
```

```
# Bootstrap
@conductor This is a mobile project: Android (Kotlin, Jetpack Compose, Hilt)
and iOS (Swift, SwiftUI). Generate Copilot config.

# Architecture review
@mobile-architect Review the current architecture and suggest MVVM + Clean Architecture

# Implement a feature
@mobile-implementor Implement the product list screen with offline-first support

# Write tests
@mobile-test-specialist Write tests for ProductListViewModel with fakes and Turbine
```

#### Use Case 4: Full Feature Delivery (End-to-End in One Session)

**Scenario**: You received a PBI and want everything done — investigation, code, tests, PR.

```
@dev-orchestrator Implement PBI-456: Add VIP discount calculation for orders above $100
```

The dev-orchestrator will:
1. Auto-detect your tech stack
2. Investigate current code flow
3. Design the solution
4. **Ask for your confirmation** before coding
5. Implement across all layers
6. Write tests with 100% branch coverage
7. Generate PR description
8. Generate conventional commit message

#### Use Case 5: Sprint Planning & Estimation

**Scenario**: You need to break down a large PBI into tasks and estimate effort.

```
# Break down a PBI
@sprint-planner Break down PBI-789: Implement payment gateway integration
with Stripe for credit card processing

# Estimate a specific task
@sprint-planner Estimate effort for: Add webhook handler for Stripe payment events
```

Output: story points, task breakdown, dependencies, risks, and a sprint backlog table you can copy to Jira/Azure DevOps.

#### Use Case 6: Refactoring & Tech Debt

**Scenario**: A service class is 800 lines and growing. You want to refactor safely.

```
# Analyze tech debt
@refactoring-specialist Analyze tech debt in OrderService.java

# Execute refactoring
@refactoring-specialist Refactor OrderService — extract pricing logic into PricingService
and discount logic into DiscountService
```

Output: before/after metrics, new extracted classes, updated tests, behavior-preserving changes.

#### Use Case 7: Multi-Stack Project

**Scenario**: Your project has a Java backend, .NET microservice, and Android/iOS apps.

```bash
# Copy bootstrap toolkit once — it supports all stacks
cp -r copilot-bootstrap/.github/ my-project/.github/
```

```
# Bootstrap will detect all stacks
@conductor Analyze this codebase and generate Copilot config

# Use stack-specific agents as needed
@implementor Add new REST endpoint for orders (Java backend)
@dotnet-implementor Add payment processing service (.NET microservice)
@mobile-implementor Implement order list screen (Android + iOS)
```

#### Use Case 8: DevContainer Setup

**Scenario**: You want to set up a dev container for local development.

```
# Review existing devcontainer
@devcontainer-reviewer Review and optimize the devcontainer configuration

# Generate devcontainer from scratch
@devcontainer-reviewer Generate a devcontainer config for our Java/Maven/Oracle project
```

#### Use Case 9: Onboarding a New Team Member

**Scenario**: A new developer joins the team and needs to understand the codebase quickly.

```
# Get a full codebase overview
@codebase-analyzer Analyze this codebase — show me the architecture,
domains, tech stack, and how everything connects

# Understand a specific flow
@sequence-diagrammer Create a sequence diagram for the order creation flow

# Understand conventions
# → Just open any file — Copilot will auto-apply the matching instruction files
# → e.g., opening a .java file activates java.instructions.md + jakartaee.instructions.md
```

#### Use Case 10: Automated Quality Workflows (Agentic Workflows)

**Scenario**: You want Copilot to automatically triage issues or run compliance checks.

```
# Generate an agentic workflow
@conductor Generate an agentic workflow for automatic issue triage
that labels bugs, assigns priority, and suggests affected modules

# Generate a scheduled compliance audit
@conductor Generate an agentic workflow that runs weekly to check
for outdated dependencies and security vulnerabilities
```

Output: `.github/copilot/` workflow files that run as GitHub Actions with Copilot as the AI agent.

### 🔄 Workflow Summary

| What You Want | Command |
|---------------|---------|
| Bootstrap Copilot for a new project | `@conductor Analyze this codebase and generate config` |
| Bootstrap with a specific stack hint | `@conductor This is a [stack] project. Generate config.` |
| Investigate a PBI / bug / feature | `@investigator Investigate: [description]` |
| Implement a feature (auto-detect stack) | `@dev-orchestrator Implement: [description]` |
| Implement (Java) | `@implementor [description]` |
| Implement (.NET) | `@dotnet-implementor [description]` |
| Implement (Python) | `@python-implementor [description]` |
| Implement (PHP) | `@php-implementor [description]` |
| Implement (Mobile) | `@mobile-implementor [description]` |
| Write unit tests | `@test-specialist Write tests for [class]` |
| Write mobile tests | `@mobile-test-specialist Write tests for [ViewModel]` |
| Code review | `@code-reviewer Review changes in [branch]` |
| Create sequence diagram | `@sequence-diagrammer Create diagram for [flow]` |
| Sprint planning | `@sprint-planner Break down [PBI]` |
| Refactoring | `@refactoring-specialist Refactor [class/module]` |
| Create PR | `@pr-manager Generate PR description` |
| Create WireMock stubs | `@mock-data-specialist Create stubs for [service]` |
| Review devcontainer | `@devcontainer-reviewer Review devcontainer config` |
| Full lifecycle (everything) | `@dev-orchestrator Implement [PBI]` |

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

#### 💻 Implementation (Stack-Specific)

```
# Java/Jakarta EE
@implementor Implement the VIP discount feature based on the investigation report

# .NET/C#
@dotnet-implementor Implement the VIP discount feature using MediatR CQRS

# Python/FastAPI
@python-implementor Implement the VIP discount feature with Pydantic validation

# PHP/Laravel
@php-implementor Implement the VIP discount feature with FormRequest validation

Output → Code changes across layers (stack-adapted):
- Entity/Model + Migration
- DTO/Schema/Resource
- Repository + Service
- Controller/Resource/Router
- DI/Config registration
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
2. Auto-detect tech stack (Java/.NET/Python/PHP)
3. Investigate → as-is analysis, to-be design, scenarios, impact, risks
4. Estimate → story points with task breakdown
5. Present findings → wait for user confirmation ⏸️
6. Implement → production code across all layers
7. Write tests → 100% branch coverage, minimal mocking, test builders
8. Generate PR description → structured, review-ready
9. Generate commit messages → conventional format
10. Summary → deliverables report with verification command
```

#### 📊 Sprint Planning

```
@sprint-planner Break down PBI-789 into technical tasks with story point estimates

Output → sprint-plan.md:
- PBI decomposition into layer-based tasks
- Story point estimates calibrated against actual codebase
- Dependency mapping between tasks
- Risk assessment with mitigations
- Sprint backlog table (copy to Jira/Azure DevOps)
```

#### ♻️ Refactoring

```
@refactoring-specialist Refactor OrderService — it's 800 lines, extract business logic

Output → refactoring plan + execution:
- Code smell analysis (God class, long method, etc.)
- Before/after metrics (LoC, complexity, coverage)
- Behavior-preserving incremental changes
- New test coverage for extracted components
```

#### 🔀 Pull Request Management

```
@pr-manager Generate PR description for current branch changes

Output → structured PR markdown:
- Summary + linked issue
- Categorized changes (features, fixes, tests, db, config)
- Impact analysis (affected areas, breaking changes)
- Testing instructions + review checklist
- Merge strategy recommendation
```

#### 🏗️ Tech Debt Analysis

```
@refactoring-specialist Analyze tech debt in this codebase

Output → tech-debt-report.md:
- Code smells categorized by severity
- Architecture violations detected
- Testing gaps with coverage stats
- Dependency health check
- Prioritized remediation backlog (Quick Wins → Strategic → Deferred)
- Health score: X/10
```

#### 🐳 DevContainer Review & Optimization

```
@devcontainer-reviewer Review and optimize the devcontainer configuration

Output → devcontainer-review-report.md:
- Health Score: X/10
- Base image analysis (pinning, official image)
- Feature audit (versions, redundancy)
- Lifecycle script placement
- Performance optimization (volumes, caching, pre-build)
- Security assessment (root user, capabilities, secrets)
- DX improvements (extensions, settings, port labels)
- Optimized devcontainer.json (copy-paste ready)
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

### Agents vs Skills vs Instructions vs Hooks vs Workflows

| Concept | Purpose | When Active | How to Invoke |
|---------|---------|-------------|---------------|
| **Agent** | Specialized AI persona with expertise | User calls `@agent-name` | `@conductor ...` |
| **Skill** | Automated task workflow | Auto-discovered via description keywords | Auto-discovery |
| **Instruction** | Coding standards for a language/framework | Auto-applied when file matches `applyTo` pattern | Automatic |
| **Hook** | Lifecycle automation (shell commands) | Runs at agent session events (format, lint, compile) | Automatic |
| **Agentic Workflow** | Autonomous AI automation via Actions | Schedule, event trigger, or slash command | `gh aw compile` → GitHub Actions |

### Supported Tech Stacks

| Stack | Detection | Implementor | Testing |
|-------|-----------|-------------|---------|
| **Java/Jakarta EE** | `pom.xml`, `build.gradle` | `@implementor` | `@test-specialist` (JUnit 5) |
| **.NET/C#** | `*.csproj`, `*.sln` | `@dotnet-implementor` | xUnit + FluentAssertions |
| **Python** | `pyproject.toml`, `manage.py` | `@python-implementor` | pytest + pytest-asyncio |
| **PHP** | `composer.json`, `artisan` | `@php-implementor` | PHPUnit/Pest |
| **Android** | `build.gradle.kts` + Android | `@mobile-implementor` | JUnit 5 + MockK + Turbine |
| **iOS** | `Package.swift`, `*.xcodeproj` | `@mobile-implementor` | XCTest/Swift Testing |

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
