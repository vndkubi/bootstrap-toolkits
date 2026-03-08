---
agent: 'agent'
description: 'Analyze current codebase and generate a complete GitHub Copilot configuration — agents, skills, instructions, hooks, agentic workflows, and copilot-instructions.md. Full bootstrap pipeline from source code analysis to validated output.'
---

# Bootstrap GitHub Copilot Configuration

You are a Copilot Configuration Generator. Your task is to analyze the current codebase and generate a **complete** `.github/` configuration optimized for this project.

## Full Pipeline Overview

```
Phase 1:  Analyze codebase structure, detect tech stack, map domains
Phase 2:  Business Domain Deep Analysis — extract business rules, entity lifecycles, domain glossary, workflows, invariants
Phase 3:  Generate copilot-instructions.md (including business domain context + usage guide)
Phase 4:  Generate domain-specific instructions (.instructions.md) per language/framework
Phase 5:  Generate custom agents tailored to the tech stack
Phase 6:  Generate skills for detected workflows
Phase 7:  Generate project-specific prompts for common workflows
Phase 8:  Generate hooks for quality automation
Phase 9:  Generate agentic workflows for automation (if GitHub Actions available)
Phase 10: Validate all generated files
Phase 11: DevContainer Setup — review existing or offer to generate new devcontainer config
Phase 12: Cleanup — delete generic bootstrap toolkit files, keep only project-specific config
```

**Phase 2 is CRITICAL** — without business domain context, agents will produce technically correct but business-unaware code. The domain glossary, business rules, and workflow maps enable all downstream agents to use correct business terminology and validate implementation against existing business rules.

## Context Budget Strategy

VS Code Copilot has a limited context window. Every loaded file competes with the user's actual code for context space. Generated configuration must be **dense, not verbose** — maximum signal per token.

### How Context Loading Works

| File Type | When Loaded | Frequency |
|-----------|-------------|-----------|
| `copilot-instructions.md` | **Every single request** | Always |
| `.instructions.md` | When active file matches `applyTo` glob | Per-file type |
| `.agent.md` | When user invokes `@agent-name` | On-demand |
| `SKILL.md` | When agent references the skill | On-demand |
| `.prompt.md` | When user types `/prompt-name` | On-demand |

### Tiered Context Architecture

**Tier 1 — Always Loaded (keep SMALL, ≤ 4 KB):**
- `copilot-instructions.md` — Project identity, tech stack summary, build commands, agent quick-reference table
- This file loads on EVERY request — every extra line here costs context across ALL interactions
- **Rule**: If information is only relevant to specific file types, move it to an `.instructions.md` with `applyTo`
- **Rule**: If information is only relevant when doing a specific workflow, move it to a `SKILL.md`

**Tier 2 — Auto-Loaded by File Type (≤ 6 KB per file, ≤ 20 KB total loaded at once):**
- `.instructions.md` files with `applyTo` globs
- Multiple instructions can match simultaneously (e.g., editing a `*Test.java` file may load both `java.instructions.md` AND `testing.instructions.md`)
- **Rule**: Estimate which instructions will co-load and keep total under 20 KB
- **Rule**: Use narrow `applyTo` patterns — prefer `**/*Test*.java` over `**/*.java` when the convention only applies to tests

**Tier 3 — On-Demand (≤ 12 KB per agent, skills can be longer):**
- Agent files — loaded only when invoked, so can be more detailed
- Skill files — loaded only when referenced, **best place for detailed workflows and domain context**
- **Rule**: Put step-by-step workflows in skills, not in agents. Agent = personality + routing. Skill = detailed playbook.
- **Rule**: Agents should reference skills by name so Copilot loads them when needed

### Size Budget Guidelines

| File Type | Target Size | Maximum | Rationale |
|-----------|------------|---------|-----------|
| `copilot-instructions.md` | 2-3 KB | 4 KB | Loaded EVERY request — must be lean |
| `.instructions.md` | 2-4 KB | 6 KB | Auto-loaded, multiple can co-load |
| `.agent.md` | 4-8 KB | 12 KB | On-demand, but competes with user code |
| `SKILL.md` | 3-8 KB | 15 KB | On-demand, loaded only when needed |
| `.prompt.md` | 1-2 KB | 3 KB | Entry point only — delegates to agent |

### Strategies for Large Codebases

**1. Domain-Scoped Instructions (for projects with 5+ domains):**

Instead of one massive instruction file per language, split by domain:
```
instructions/
├── java.instructions.md              ← Core Java conventions (all .java files)
├── java-order.instructions.md        ← Order domain patterns (applyTo: '**/order/**/*.java')
├── java-payment.instructions.md      ← Payment domain patterns (applyTo: '**/payment/**/*.java')
└── java-testing.instructions.md      ← Test conventions (applyTo: '**/*Test*.java')
```
Each file stays small (2-4 KB) and only loads for its domain. The core `java.instructions.md` covers universal conventions; domain files add domain-specific business rules, entity relationships, and patterns.

**2. Skill-Based Deep Context (for complex workflows):**

Move detailed workflows and domain context from agents to skills:
```
# ❌ BAD: 15 KB agent with embedded workflow
# agent.md contains: role + routing + full step-by-step + examples + patterns

# ✅ GOOD: 6 KB agent + 8 KB skill
# agent.md contains: role + routing + "use implement-feature skill for step-by-step"
# skill/SKILL.md contains: full step-by-step + examples + patterns
```
Skills load only when the agent references them — saving context for requests that don't need the full workflow.

**3. Concise copilot-instructions.md (always):**

The copilot-instructions.md must be a **quick-reference card**, not a documentation dump:
```markdown
# ❌ BAD — 15 KB copilot-instructions.md
## Business Domain Context
[2000 words of domain glossary, rules, workflows, invariants...]

# ✅ GOOD — 3 KB copilot-instructions.md  
## Business Domain Context
Key domains: Orders, Payments, Inventory, Users
See domain-specific .instructions.md files for business rules per domain.
Key invariants: Order total must match line items sum; inventory decrements are atomic.
```

**4. Reference Linking Between Files:**

Use cross-references to avoid duplicating context:
```markdown
# In agent file:
For implementation patterns, refer to the project's java.instructions.md and jakartaee.instructions.md.
For step-by-step workflow, use the implement-feature skill.

# In copilot-instructions.md:
For domain-specific conventions, see the .instructions.md files matching your current file type.
```

### Measuring Context Budget

After generating all files, calculate the context budget for common scenarios:

| Scenario | Files Loaded | Budget Check |
|----------|-------------|--------------|
| General chat | copilot-instructions.md | Should be ≤ 4 KB |
| Editing `*.java` | copilot-instructions.md + java.instructions.md + jakartaee.instructions.md + error-handling.instructions.md + security.instructions.md + logging.instructions.md | Total should be ≤ 24 KB |
| Using `@implementor` on `*.java` | Above + implementor.agent.md | Total should be ≤ 36 KB |
| Using `/implement-feature` | Above + implement-feature.prompt.md + implement-feature/SKILL.md | Total should be ≤ 48 KB |

> **If total exceeds budget**: Split large instructions by domain, move detailed content from agents to skills, or trim copilot-instructions.md.

## Step 1: Analyze Codebase Structure

Scan the project root and explore **ALL directories recursively** to build a complete picture. Do NOT rely on surface-level checks.

### Project Size Classification (detect FIRST — determines generation strategy)

Before diving into tech stack detection, classify the project size to determine the appropriate generation strategy:

```
Small Project:   ≤ 20 source files, ≤ 3 domains, single module
Medium Project:  21-100 source files, 3-5 domains, 1-3 modules
Large Project:   101-500 source files, 5-10 domains, 3+ modules
Enterprise:      500+ source files, 10+ domains, 5+ modules
```

**How to measure quickly:**
```bash
# Count source files (adjust extensions for detected language)
find . -name '*.java' -not -path '*/test/*' -not -path '*/target/*' | wc -l

# Count domains (top-level packages/folders under main source root)
ls src/main/java/com/company/project/ | head -20

# Count modules (for multi-module projects)
grep -c '<module>' pom.xml   # Maven
grep -c "include(" settings.gradle.kts  # Gradle
```

**This classification determines:**

| Aspect | Small/Medium | Large/Enterprise |
|--------|-------------|-----------------|
| Source file sampling | 5-10 files per language | **10-15 files per language, 2-3 per domain** |
| Domain analysis depth | Inline in copilot-instructions.md | **Domain-scoped .instructions.md per domain** |
| Business rules | In copilot-instructions.md (max 7 bullets) | **In domain-scoped .instructions.md files** |
| Agent specificity | Generic project patterns | **Reference domain instructions by name** |
| Skills detail | Standard workflows | **Domain-aware workflows with cross-module patterns** |
| Instructions count | 5-10 files | **10-20+ files (including domain-scoped)** |
| copilot-instructions.md | Full context fits in ≤ 4 KB | **Index/reference card only — domain pointers** |

> **CRITICAL**: For Large/Enterprise projects, the copilot-instructions.md becomes a pure **index file** — it lists domains and points to domain-scoped instructions. Business rules, entity lifecycles, and domain glossaries live in domain-scoped .instructions.md files with narrow `applyTo` patterns, so they only load when the developer is editing that domain.

### Tech Stack Detection (Thorough Scan)

**Build files & dependencies (READ the contents, don't just check existence):**
- `pom.xml` → Read `<dependencies>` for Spring Boot, Jakarta EE, Quarkus, etc. Check `<modules>` for multi-module. Check `<plugins>` for build tools (Spotless, Checkstyle, Flyway, etc.)
- `build.gradle.kts` / `build.gradle` → Read `dependencies {}` block, `plugins {}`, check for Android plugins, version catalogs (`libs.versions.toml`)
- `package.json` → Read `dependencies` AND `devDependencies` for React, Vue, Angular, testing libs, linters, formatters
- `composer.json` → Read `require` for Laravel/Symfony, `require-dev` for PHPUnit/Pest
- `pyproject.toml` / `requirements*.txt` / `setup.py` → Read for Django, FastAPI, Flask, SQLAlchemy, pytest, Black, Ruff
- `Cargo.toml`, `go.mod`, `*.csproj`, `*.sln` → Read for framework dependencies
- `Gemfile` → Read for Rails, RSpec, etc.

**Source file inspection (adaptive sampling based on project size):**

*Small/Medium projects (≤ 100 source files):*
- Read **5-10 representative files** per language (prioritize files with business logic)

*Large/Enterprise projects (100+ source files):*
- Read **10-15 files per language**, sampled across domains: **2-3 files from each detected domain**
- Prioritize: 1 service class + 1 entity/model + 1 REST resource per domain
- Also read **shared/common modules** to detect cross-cutting patterns
- Count files per domain to gauge domain size (affects domain-scoped instruction depth)

- Count files per extension: `.java`, `.kt`, `.swift`, `.ts`, `.tsx`, `.py`, `.php`, `.cs`, `.go`, `.rs`
- Read actual source files to detect:
  - Framework annotations (`@Entity`, `@RestController`, `@Injectable`, `@Component`)
  - Import patterns (Jakarta vs javax, Spring vs CDI)
  - DI approach (constructor injection, field injection, Hilt, CDI, manual DI)
  - Logging framework (SLF4J, Logback, Log4j, NLog, Python logging)
  - HTTP client libraries (Retrofit, OkHttp, HttpClient, RestTemplate, requests)

**Database detection (go deeper than SQL files):**
- Look for ORM entities/models: `@Entity`, `@Table`, Django models, Eloquent models, EF Core DbContext
- Migration files: `V*.sql` (Flyway), Liquibase changelogs, Django migrations, Laravel migrations, Alembic
- Connection configuration: `application.properties`, `application.yml`, `.env`, `database.php`, `settings.py`
- Database type: Oracle (`ojdbc`), PostgreSQL (`postgresql`), MySQL, SQL Server, SQLite, MongoDB

**Testing detection (verify actual testing patterns):**
- Read test files to find: JUnit 4 vs JUnit 5, TestNG, pytest, PHPUnit, Jest, Mocha, XCTest, Espresso
- Check for test assertions: AssertJ, Hamcrest, FluentAssertions, pytest assertions
- Check for mocking: Mockito, MockK, NSubstitute, unittest.mock, Mockery, Jest mocks
- Check for test data: Test builders, Faker/Bogus, factory_boy, Model factories
- Identify WireMock/MockServer/Nock for HTTP mocking

**CI/CD detection:**
- `.github/workflows/*.yml` → GitHub Actions (read for test, build, deploy stages)
- `Jenkinsfile` → Jenkins pipeline
- `.gitlab-ci.yml` → GitLab CI
- `.circleci/config.yml` → CircleCI
- `azure-pipelines.yml` → Azure DevOps
- `Dockerfile` / `docker-compose.yml` → Container setup

**Formatter/Linter detection (needed for hooks in Step 7):**
- Read build files for: Spotless, google-java-format, Checkstyle, PMD, SpotBugs, ktlint, detekt
- Read `package.json` for: Prettier, ESLint, Stylelint, Husky
- Read `pyproject.toml` for: Black, Ruff, isort, Flake8, mypy
- Read `composer.json` for: PHP_CodeSniffer, PHPStan, Psalm
- Look for config files: `.prettierrc`, `.eslintrc`, `.editorconfig`, `checkstyle.xml`, `phpstan.neon`

### Architecture Detection (Trace the Structure)

- **Module structure**: Single vs multi-module (check `settings.gradle.kts`, `pom.xml` modules, `tsconfig.json` references, monorepo tools like nx/lerna)
- **Package organization**: Read package/folder structure — feature-based (`order/`, `payment/`, `user/`) vs layer-based (`controller/`, `service/`, `repository/`)
- **Architecture pattern**: Infer from folder structure AND code:
  - MVC: controllers + views + models
  - MVVM: ViewModels + data binding
  - Clean Architecture: `domain/`, `data/`, `presentation/` or `core/`, `infrastructure/`
  - Hexagonal: `ports/`, `adapters/`
  - CQRS: Commands + Queries + Handlers
- **API patterns**: REST (JAX-RS, Spring MVC, FastAPI), GraphQL (schema files, resolvers), gRPC (`.proto` files)
- **Event/messaging**: Kafka topics, RabbitMQ, JMS, Redis pub/sub, event handlers
- **Caching**: Redis config, Caffeine, EhCache, in-memory caches

### Convention Detection (Read Real Code)

Read representative source files (choose files with business logic, not generated code):

*Small/Medium projects:* Read **5-10 files** per language.
*Large/Enterprise projects:* Read **2-3 files per domain** + shared modules. Note which conventions are universal vs domain-specific.
- Naming conventions (PascalCase classes, camelCase methods, snake_case variables, etc.)
- Import organization (grouped? sorted? wildcard imports?)
- Error handling patterns (custom exception hierarchy? Result types? try/catch patterns?)
- Logging approach (structured? what format? what levels?)
- Documentation style (JavaDoc? KDoc? docstrings? inline comments?)
- Code organization within files (field order, method order, constant placement)
- Null safety approach (Optional? nullable types? null checks?)

### Domain Map (for large projects)
- Identify bounded contexts / feature domains from package/folder structure
- Map cross-domain dependencies (which domains call which?)
- Note shared kernel / common modules (`shared/`, `common/`, `core/`, `utils/`)
- Count entities/models per domain to gauge complexity

## Step 1b: Business Domain Deep Analysis

Analyze service classes, domain models, validators, and business workflows to extract:

### Business Rules
- Read service classes and validators for business logic (e.g., "order total cannot exceed credit limit")
- Identify validation rules at each layer (REST, Service, Repository)
- Document entity lifecycle states and valid transitions

### Domain Glossary
- Extract key business terms from class names, method names, and comments
- Map technical names to business concepts (e.g., `CreditLimit` → maximum credit allowed)
- Note domain-specific terminology used consistently in the codebase

### Workflows & Invariants
- Trace end-to-end business processes (e.g., order creation → payment → fulfillment)
- Identify data consistency rules and constraints
- Document cross-domain workflows and dependencies

### Adaptive Depth by Project Size

**Small/Medium projects:** Collect all domain context in a single document. This will go directly into `copilot-instructions.md` (max 7 bullets for business rules, brief domain glossary).

**Large/Enterprise projects:** Analyze each domain separately and produce **per-domain context** that feeds into domain-scoped `.instructions.md` files (Step 5):
- For each domain: extract its business rules, entity lifecycle, key relationships, and domain glossary
- Limit analysis to **top 3-5 domains by complexity** (most entities, most services, most cross-domain calls) — remaining domains get lighter treatment
- Note **cross-domain dependencies** (e.g., "Order domain calls Payment domain for settlement") — these go into `copilot-instructions.md` as a dependency map
- Each domain's context becomes a separate domain-scoped `.instructions.md` in Step 5

> This context enables agents to use correct business terminology, validate implementation against existing business rules, and write test names that describe business scenarios.

## Step 2: Generate copilot-instructions.md

Create `.github/copilot-instructions.md` — this file loads on EVERY request, so keep it **≤ 4 KB** (quick-reference card, not documentation).

> **Context Budget Rule**: Move domain details to `.instructions.md` files (Tier 2), detailed workflows to skills (Tier 3). Only put universally-needed facts here.

```markdown
# [Project Name]

## Overview
[1-2 sentences: what this project does]

## Tech Stack
[Language] | [Framework] | [Build Tool] | [Database] | [Test Framework]

## Architecture
[1-2 sentences: pattern + module structure]

## Build & Run
[Essential commands only — build, test, run]

## Key Conventions
[Top 5-7 rules ONLY — the most impactful conventions that apply across all files]
[Move language-specific conventions to .instructions.md files]

## Domain Map
[For multi-domain: domain names + 1-line responsibility each]
[Move domain details to domain-scoped .instructions.md files]

## Business Domain Context
[Key invariants and critical business rules ONLY — max 5-7 bullet points]
[Move full domain glossary, entity lifecycles, workflows to domain-scoped .instructions.md]

## Available Agents & How to Use

Use these agents in VS Code Chat with `@agent-name`:

| Agent | When to Use | Example |
|-------|-------------|---------|
| `@dev-orchestrator` | **Start here** — routes to the right agent automatically | `@dev-orchestrator Implement PBI-123: Add discount calculation` |
| [list each generated agent with its purpose and example invocation] |

### Common Workflows
- **Implement a feature**: `@dev-orchestrator Implement [description]` or `@implementor [description]`
- **Investigate a bug/PBI**: `@investigator Investigate [PBI/bug description]`
- **Write tests**: `@test-specialist Write tests for [class/feature]`
- **Code review**: `@code-reviewer Review changes in [branch]`
- **Create a PR**: `@pr-manager Generate PR description`

### Available Prompts (slash commands)
Use these in VS Code Chat with `/prompt-name`:

| Prompt | Purpose |
|--------|---------|
| [list each generated prompt with its purpose] |
```

> **IMPORTANT**: Populate the agents table with ONLY the agents generated in Step 3. Include the `@dev-orchestrator` first (if generated) since it's the primary entry point. Populate the prompts table with ONLY the prompts generated in Step 6. Use real project context in examples (e.g., actual entity names, service names).

### Large/Enterprise Project Variant

For Large/Enterprise projects (detected in Step 1), the copilot-instructions.md becomes a **pure index** — domain details live in domain-scoped `.instructions.md` files. Key differences:

```markdown
## Domain Map
| Domain | Responsibility | Key Entities | Instructions |
|--------|---------------|-------------|--------------|
| Orders | Order lifecycle, pricing | Order, OrderLine, Discount | java-order-domain.instructions.md |
| Payments | Payment processing, settlements | Payment, Refund, Invoice | java-payment-domain.instructions.md |
| Users | Authentication, profiles | User, Role, Permission | java-user-domain.instructions.md |

Cross-domain: Order → Payment (settlement), Order → Inventory (stock check), User → Order (ownership)

## Business Domain Context
Key invariants only — full rules live in domain-scoped instruction files:
- Order total must equal sum of line items
- Payment settlement is idempotent (retry-safe)
- Inventory decrements are atomic (pessimistic lock)

See domain-scoped .instructions.md files for full business rules per domain.
```

> The difference: Small projects inline business rules; Large projects index them with pointers to domain-scoped files. Both stay under 4 KB.

## Step 3: Generate Agents

Create `.github/agents/` with agents tailored to the detected tech stack.

**Always create (core agents):**
- `codebase-analyzer.agent.md` — Deep codebase analysis, domain mapping, tech stack detection
- `implementor.agent.md` — Code implementation following project patterns (default: Java/Jakarta EE)
- `test-specialist.agent.md` — Unit tests with the detected test framework
- `code-reviewer.agent.md` — Code review with project standards

**Conditionally create based on detection:**

*Stack-specific implementors (create for each detected stack):*
- If .NET/C# detected → `dotnet-implementor.agent.md` (ASP.NET Core, EF Core, Clean Architecture)
- If Python detected → `python-implementor.agent.md` (Django/FastAPI, SQLAlchemy, Pydantic)
- If PHP detected → `php-implementor.agent.md` (Laravel/Symfony, Eloquent/Doctrine, PSR standards)

*Investigation & visualization:*
- If complex business logic → `investigator.agent.md` (PBI investigation, as-is/to-be analysis)
- If multi-layer architecture → `sequence-diagrammer.agent.md` (Mermaid sequence diagrams)

*Mobile development:*
- If Android/iOS detected → `mobile-implementor.agent.md`, `mobile-test-specialist.agent.md`
- If mobile architecture review needed → `mobile-architect.agent.md` (MVVM, Clean Architecture)

*Agile & workflow (generate when evidence of team development practices):*
- **Always generate** `dev-orchestrator.agent.md` — The primary entry point for developers. Auto-routes to sub-agents based on requirement analysis (user never needs to manually pick an agent). Generate for ANY project with more than 1 implementor agent.
- If project has **service/business logic layers** (>3 service classes OR >2 domain models) → `sprint-planner.agent.md` (PBI decomposition, story points, capacity)
- If project has **>500 lines in any single class** OR **code smell indicators** (deep nesting, long methods, high cyclomatic complexity) → `refactoring-specialist.agent.md` (safe refactoring, before/after metrics)
- If project uses **git** (`.git/` exists) AND has **>5 source files** → `pr-manager.agent.md` (PR descriptions, review readiness, merge strategy)

*Infrastructure & mocking:*
- If WireMock/mock server → `mock-data-specialist.agent.md` (WireMock stubs, test fixtures)
- If devcontainer present → `devcontainer-reviewer.agent.md` (optimize performance, security, DX)

*Meta agents (always create for self-bootstrapping projects):*
- If meta/generator project → `agent-generator.agent.md` (generates agents/skills/instructions from analysis)

**Agent file format** (target: 4-8 KB, max: 12 KB — loaded on-demand when invoked):
```markdown
---
name: 'Agent Name'
description: 'Clear description of role and expertise (10-1024 chars)'
---

You are a [role]...
[Role definition + routing logic + project-specific patterns]
[For detailed step-by-step workflows, reference a skill instead of embedding here]
```

> **IMPORTANT**: Do NOT include `tools` field — this gives agents access to ALL available tools.
> **CONTEXT BUDGET**: Agent files load alongside copilot-instructions.md + matching .instructions.md files. Keep agents focused on role/routing — put detailed workflows in skills that load only when needed.

### Large Project Agent Guidance

For Large/Enterprise projects, agents should **reference domain-scoped instructions by name** instead of embedding domain knowledge:

```markdown
# ❌ BAD: Agent embeds domain rules
## Order Domain Rules
- Order total must equal sum of line items...
- VIP discount is 15%...
[100+ lines of domain context per domain]

# ✅ GOOD: Agent references domain instructions
## Domain Context
When working in a specific domain, refer to the matching domain instruction file:
- Order domain → java-order-domain.instructions.md
- Payment domain → java-payment-domain.instructions.md
These files auto-load when editing files in that domain's package.
```

This keeps agent files under 12 KB even for Enterprise projects with 10+ domains.

### Agent ↔ Skill Separation Pattern

Agents should define WHAT they do and HOW they route. Skills should define the detailed WORKFLOW.

```markdown
# ❌ BAD: 15 KB agent with embedded workflow
---
name: 'Implementor'
description: 'Implements features...'
---
You are the implementor for [project]...

## Implementation Steps
1. Read all related entities in src/domain/...
2. Check existing validation in src/service/...
3. Create DTO in src/dto/ following DtoMapper pattern...
4. [... 200 more lines of step-by-step detail ...]

# ✅ GOOD: 6 KB agent + referenced skill
---
name: 'Implementor'
description: 'Implements features...'
---
You are the implementor for [project]...

## How You Work
- Follow the implement-feature skill for step-by-step implementation workflow
- Project patterns: [key conventions — constructor injection, Result<T> returns, etc.]
- Package structure: src/{domain}/{layer}/ (e.g., src/order/service/, src/order/entity/)

## Key References
- Domain business rules: see domain-scoped .instructions.md files
- Testing patterns: coordinate with @test-specialist
```

### Dev Orchestrator — Special Wiring (CRITICAL)

The `dev-orchestrator.agent.md` is a **meta-agent** that delegates to other agents. Its frontmatter MUST include an `agents:` field listing ALL other generated agents as sub-agents. Without this, it cannot route to them.

**Dev Orchestrator file format:**
```markdown
---
name: 'Dev Orchestrator'
description: 'Full-lifecycle development orchestrator for [project]. Receives requirements or PBIs and auto-routes to sub-agents: investigate, implement [stack] code, write tests, generate PR descriptions, and create conventional commits.'
agents: ['Codebase Analyzer', 'Investigator', 'Implementor', 'Test Specialist', 'Code Reviewer', 'Sequence Diagrammer', 'Sprint Planner', 'PR Manager']
---

You are the primary development orchestrator for [project]...
```

**Rules for the `agents:` field:**
1. List ONLY agents that were actually generated in this bootstrap (if `sprint-planner.agent.md` was not generated, do NOT list `Sprint Planner`)
2. Use the agent's `name` from its frontmatter (e.g., `'Implementor'` not `'implementor.agent.md'`)
3. The dev-orchestrator MUST include auto-routing instructions that reference these agents by name
4. The body must contain a **Routing Decision Matrix** that maps user intent signals to specific sub-agents (see the bootstrap toolkit's dev-orchestrator.agent.md as reference)

**Example with detected Java + investigation + testing:**
```yaml
agents: ['Codebase Analyzer', 'Investigator', 'Implementor', 'Test Specialist', 'Sequence Diagrammer', 'Code Reviewer', 'PR Manager']
```

**Example with detected .NET + Python (multi-stack):**
```yaml
agents: ['Codebase Analyzer', 'Investigator', 'DotNet Implementor', 'Python Implementor', 'Test Specialist', 'Code Reviewer', 'Sprint Planner', 'PR Manager']
```

## Step 4: Generate Skills

Create `.github/skills/[name]/SKILL.md` for common workflows detected.

**Always create (core skills):**
- `analyze-codebase/SKILL.md` — Deep codebase analysis → structured report
- `implement-feature/SKILL.md` — Step-by-step implementation guide
- `generate-unit-tests/SKILL.md` — Test generation workflow
- `review-code-changes/SKILL.md` — Code review workflow
- `conventional-commit/SKILL.md` — Conventional commit message generation

**Conditionally create based on detection:**

*Investigation & visualization:*
- If complex flows → `investigate-pbi/SKILL.md` (PBI investigation with as-is/to-be)
- If multi-layer architecture → `generate-sequence-diagram/SKILL.md` (Mermaid diagrams)

*Mobile:*
- If Android/iOS detected → `implement-mobile-feature/SKILL.md`, `generate-mobile-tests/SKILL.md`

*Agile & estimation (generate when evidence of structured development):*
- **Always generate** `orchestrate-development/SKILL.md` — Matches `dev-orchestrator` agent. Generate whenever `dev-orchestrator.agent.md` is generated.
- If **>3 service classes** OR **>2 domain models** → `sprint-planning/SKILL.md` (PBI decomposition, sprint backlogs)
- If **build files with dependencies** exist → `estimate-effort/SKILL.md` (story point estimation with codebase analysis)

*Documentation & architecture:*
- If architecture decisions → `generate-adr/SKILL.md` (Architecture Decision Records)
- If PR workflow → `generate-pr-description/SKILL.md` (PR description generation)
- If tech debt concerns → `technical-debt-analysis/SKILL.md` (tech debt assessment & remediation)

*Infrastructure & mocking:*
- If WireMock → `generate-wiremock/SKILL.md` (WireMock stub configurations)
- If devcontainer → `optimize-devcontainer/SKILL.md` (DevContainer optimization)
- If GitHub Actions → `generate-agentic-workflow/SKILL.md` (Copilot Agentic Workflows)

*Meta/bootstrap:*
- If generator project → `generate-copilot-config/SKILL.md` (full bootstrap pipeline)
- If hooks needed → `generate-hooks/SKILL.md` (lifecycle hook generation)

**Skill file format** (target: 3-8 KB, max: 15 KB — loaded only when referenced, best place for detailed content):
```markdown
---
name: skill-name
description: 'What this skill does, when to use it, trigger keywords (10-1024 chars)'
---

# Skill Title

## When to Use
[Conditions and trigger phrases]

## Workflow
[Detailed step-by-step instructions — this is where complex workflows belong]
[Include project-specific patterns, examples, and domain context here]
```

> **CONTEXT BUDGET**: Skills are the best place for detailed domain workflows — they only load when an agent explicitly references them. Move heavy content here instead of bloating agents or instructions.

## Step 5: Generate Instructions

Create `.github/instructions/*.instructions.md` for each detected language/framework.

**Instruction file format** (target: 2-4 KB, max: 6 KB — auto-loaded when `applyTo` matches, multiple can co-load):
```markdown
---
description: 'What standards this covers'
applyTo: 'glob/pattern/**/*.ext'
---

# Standards Title

## Conventions
[Language-specific rules detected from codebase — concise bullet points, not essays]

## Examples
[✅ Correct and ❌ Incorrect patterns — 2-3 examples max]
```

> **CONTEXT BUDGET**: Multiple instruction files load simultaneously (e.g., java + jakartaee + security for a single .java file). Keep each file ≤ 6 KB so the combined total stays under 20 KB. Use narrow `applyTo` patterns to avoid unnecessary loading.

**Common patterns:**

*Language standards:*
- `**/*.java` → Java coding standards (`java.instructions.md`)
- `**/*.kt` → Kotlin standards (`kotlin.instructions.md`)
- `**/*.swift` → Swift standards (`swift.instructions.md`)
- `**/*.cs, **/*.csproj, **/*.razor` → .NET/C# standards (`dotnet.instructions.md`)
- `**/*.py, **/pyproject.toml` → Python standards (`python.instructions.md`)
- `**/*.php, **/composer.json` → PHP standards (`php.instructions.md`)
- `**/*.ts` or `**/*.tsx` → TypeScript standards

*Framework standards:*
- `**/*.java` → Jakarta EE conventions (`jakartaee.instructions.md`)
- `**/*Resource*.java, **/*Controller*.java` → REST API design (`api-design.instructions.md`)
- `**/*.java` → Error handling patterns (`error-handling.instructions.md`)
- `**/*.java` → Security standards (`security.instructions.md`)
- `**/*.java` → Logging & observability (`logging.instructions.md`)

*Build tools:*
- `**/pom.xml` → Maven conventions (`maven.instructions.md`)
- `**/*.gradle.kts` → Gradle conventions (`gradle.instructions.md`)

*Testing & mocking:*
- `**/*Test*.java` → Testing standards (`testing.instructions.md`)
- `**/wiremock/**/*.json` → WireMock conventions (`wiremock.instructions.md`)

*Database:*
- `**/*.sql` → Oracle SQL standards (`oracle-sql.instructions.md`)
- `**/*.sql, **/db/migration/**` → Database migration conventions (`database-migration.instructions.md`)

*Mobile:*
- `**/src/main/**/*.kt` → Android conventions (`android.instructions.md`)
- `**/*.swift` → iOS conventions (`ios.instructions.md`)

*Infrastructure:*
- `**/.devcontainer/**, **/devcontainer.json` → DevContainer standards (`devcontainer.instructions.md`)

### Domain-Scoped Instructions (for large projects with 5+ domains)

For large codebases, create **per-domain instruction files** that only load when editing files in that domain. This keeps each file small and provides domain-specific business context exactly when needed.

**Generation trigger (uses Step 1 Project Size Classification):**

| Project Size | Domains | Action |
|-------------|---------|--------|
| Small | ≤ 3 | Domain rules inline in `copilot-instructions.md` — no domain-scoped files |
| Medium | 3-5 | Domain rules inline if total ≤ 4 KB; create domain-scoped files if not |
| Large | 5-10 | **Always create domain-scoped `.instructions.md` per domain** |
| Enterprise | 10+ | Domain-scoped files + consider **sub-domain grouping** (e.g., `java-order-*.instructions.md`) |

> **CRITICAL**: Domain-scoped instructions are populated with the per-domain context collected in Step 1b. Each domain's business rules, entity lifecycle, relationships, and glossary go into its own file — NOT into `copilot-instructions.md`.

**Pattern:**
```
instructions/
├── java.instructions.md                        ← Universal Java conventions (applyTo: '**/*.java')
├── java-order-domain.instructions.md           ← Order domain rules (applyTo: '**/order/**/*.java')
├── java-payment-domain.instructions.md         ← Payment domain rules (applyTo: '**/payment/**/*.java')
└── java-testing.instructions.md                ← Test conventions (applyTo: '**/*Test*.java')
```

**Domain instruction file content:**
```markdown
---
description: 'Order domain business rules, entity relationships, and patterns'
applyTo: '**/order/**/*.java'
---

# Order Domain Conventions

## Business Rules
- Order total must equal sum of line item amounts
- Orders transition: DRAFT → PENDING → CONFIRMED → SHIPPED → DELIVERED
- VIP customers (tier >= GOLD) get auto-discount at confirmation

## Entity Relationships
- Order → OrderLine (1:N), Order → Customer (N:1), Order → Payment (1:1)

## Domain Patterns
- All monetary calculations use BigDecimal with HALF_UP rounding
- Order state transitions are validated in OrderService.transition()
```

> **CONTEXT BUDGET**: Domain instructions give you the best of both worlds — rich domain context that only loads when the developer is actually working in that domain. A developer editing `PaymentService.java` gets payment-specific business rules without the cognitive overhead of order/inventory/shipping rules.

## Step 6: Generate Prompts

Create `.github/prompts/` with project-specific prompt files for common workflows. These replace the generic bootstrap prompts.

**Always create (core prompts):**
- `implement-feature.prompt.md` — End-to-end feature implementation (delegates to `@dev-orchestrator`)
- `review-changes.prompt.md` — Code review for current branch changes (delegates to `@code-reviewer`)
- `learn-codebase.prompt.md` — Interactive codebase onboarding guide

**Conditionally create based on generated agents:**
- If `investigator.agent.md` generated → `investigate-pbi.prompt.md` (PBI/bug investigation)
- If `sequence-diagrammer.agent.md` generated → `create-diagram.prompt.md` (sequence diagram generation)
- If `sprint-planner.agent.md` generated → `plan-sprint.prompt.md` (sprint planning & PBI decomposition)
- If `refactoring-specialist.agent.md` generated → `refactor-code.prompt.md` (guided refactoring)
- If `pr-manager.agent.md` generated → `create-pr.prompt.md` (PR description generation)
- If `mock-data-specialist.agent.md` generated → `generate-mocks.prompt.md` (WireMock/test fixture generation)
- If mobile agents generated → `implement-mobile-feature.prompt.md` (mobile feature implementation)

**Prompt file format:**
```markdown
---
agent: 'agent'
description: 'Clear description of what this prompt does and when to use it (10-1024 chars)'
---

# Prompt Title

You are the `@[appropriate-agent]`. [Task description tailored to THIS project].

## Instructions

1. [Step 1 — using project-specific context: actual entity names, service names, patterns]
2. [Step 2]
...

## Important

- Follow [project name] coding conventions
- Use [detected framework] patterns as seen in existing codebase
- [Any project-specific constraints]
```

**Key rules for prompt generation:**
1. Each prompt MUST delegate to an agent that was actually generated in Step 3 — never reference non-existent agents
2. Use project-specific context: real entity names, service names, package structures, and patterns found during analysis
3. The `description` field should include trigger keywords users would naturally type (e.g., "implement", "feature", "build")
4. Prompts should complement agents — they provide a structured entry point for common workflows, while agents handle ad-hoc requests

## Step 7: Generate Hooks

Create `.github/hooks/*.json` files for lifecycle automation during agent sessions.

### Detect Project Tooling

Search for formatters, linters, and build tools:
- **Formatters**: Prettier (package.json), Spotless/google-java-format (pom.xml/build.gradle), Black (pyproject.toml), ktlint, SwiftFormat
- **Linters**: ESLint, Checkstyle, PMD, SpotBugs, detekt, SwiftLint
- **Build tools**: Maven, Gradle, npm/yarn, cargo, tsc

### Generate Hook Files

**Auto-format hook** (`auto-format.json`) — if formatter detected:
```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "command",
        "bash": "[detected formatter command]",
        "powershell": "[detected formatter command]",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

**Lint check hook** (`lint-check.json`) — if linter detected:
```json
{
  "version": 1,
  "hooks": {
    "agentStop": [
      {
        "type": "command",
        "bash": "[detected linter command]",
        "powershell": "[detected linter command]",
        "cwd": ".",
        "timeoutSec": 60
      }
    ]
  }
}
```

**Compile check hook** (`compile-check.json`) — if build tool detected:
```json
{
  "version": 1,
  "hooks": {
    "agentStop": [
      {
        "type": "command",
        "bash": "[detected compile command]",
        "powershell": "[detected compile command]",
        "cwd": ".",
        "timeoutSec": 120
      }
    ]
  }
}
```

> **Rules**: Provide both `bash` and `powershell`. Keep `postToolUse` hooks fast (< 30s). Non-zero exit blocks the action. Use actual project commands, not generic placeholders.

## Step 8: Generate Agentic Workflows (if GitHub Actions available)

If `.github/workflows/` exists or the project uses GitHub Actions, generate agentic workflow files (`.md` with frontmatter) for automation:

**Conditionally create:**
- If issue tracking → issue triage workflow
- If PR workflow → PR compliance/review workflow
- If deployment pipeline → deployment gate workflow

**Agentic workflow file format:**
```markdown
---
name: 'Workflow Name'
description: 'What this workflow automates'
triggers:
  - type: issue
    events: [opened, labeled]
---

[Workflow instructions for the Copilot coding agent]
```

> Only generate if the project already uses GitHub Actions. Otherwise skip and note in the summary.

## Step 9: Validate

After generating all files, perform **both structural and functional validation**:

### 9a. Structural Validation (Syntax & Schema)

- [ ] All `.agent.md` files have valid YAML frontmatter with `name` (string, 1-100 chars) and `description` (string, 10-1024 chars)
- [ ] All `SKILL.md` files have `name` (kebab-case, no spaces) and `description` (10-1024 chars)
- [ ] All `.instructions.md` files have `description` (string) and valid `applyTo` glob pattern
- [ ] All `.prompt.md` files have `mode` (string, typically `'agent'`) and `description` (string, 10-1024 chars)
- [ ] All `.json` hook files have valid JSON with `"version": 1` and valid hook event keys (`postToolUse`, `agentStop`)
- [ ] All YAML frontmatter opens with `---` and closes with `---` on separate lines
- [ ] No trailing commas in JSON files
- [ ] No invalid characters in file names (use kebab-case for skills, dot-separated for instructions/agents)

### 9b. Content Validation (Accuracy & Consistency)

- [ ] `copilot-instructions.md` accurately reflects the detected tech stack, architecture, and conventions
- [ ] `copilot-instructions.md` "Available Agents" table lists ALL generated agents with correct descriptions
- [ ] `copilot-instructions.md` "Available Prompts" table lists ALL generated prompts
- [ ] Instructions reference **real patterns found in actual source files** — not generic boilerplate
- [ ] Agent descriptions match their actual capabilities and the project's tech stack
- [ ] Prompt descriptions match the agents they delegate to
- [ ] Skill descriptions include relevant **trigger keywords** that users would naturally say
- [ ] No hardcoded paths, package names, or project-specific assumptions that don't match the actual codebase
- [ ] `applyTo` glob patterns in instructions actually match files that EXIST in the project
- [ ] Hook commands reference tools that are **actually installed** in the project (verify via build files)

### 9c. Functional Validation (Will It Actually Work?)

Perform these runtime checks to ensure the generated config is usable:

1. **Glob pattern test**: For each `.instructions.md`, verify the `applyTo` pattern matches at least 1 existing file in the project:
   ```bash
   # Example: verify applyTo: '**/*.java' matches files
   find . -name '*.java' -type f | head -5
   ```
   If a pattern matches **zero files**, either fix the pattern or remove the instruction file.

2. **Hook command test**: For each hook `.json` file, dry-run the command to verify the tool exists:
   ```bash
   # Example: verify Maven is available
   mvn --version 2>/dev/null && echo "OK" || echo "FAIL: mvn not found"
   ```
   If the command fails, either fix the command or remove the hook.

3. **Cross-reference check**: Verify generated agents reference skills/instructions that exist:
   - If an agent mentions "use the investigate-pbi skill", `investigate-pbi/SKILL.md` must exist
   - If an instruction references a convention, that convention must be observable in the codebase

4. **Agent self-description test**: Read each generated agent and verify:
   - Its description doesn't claim capabilities the project doesn't have (e.g., "WireMock" when no WireMock exists)
   - Its instructions reference actual project patterns (file paths, class names, package structure)

5. **Completeness check**: Verify nothing was missed:
   - Every detected language has at least one instruction file
   - Every detected framework has appropriate agent coverage
   - The `dev-orchestrator` (if generated) has an `agents:` field in frontmatter listing ALL other generated agents
   - The `dev-orchestrator` body contains a Routing Decision Matrix mapping user intent to sub-agents
   - Every agent listed in `dev-orchestrator`'s `agents:` field has a corresponding `.agent.md` file
   - Every prompt in `.github/prompts/` references an agent that exists in `.github/agents/`
   - The "Available Agents" table in `copilot-instructions.md` matches the agents in `.github/agents/`
   - The "Available Prompts" table in `copilot-instructions.md` matches the prompts in `.github/prompts/`

6. **Context budget check**: Measure file sizes and verify budgets:
   ```bash
   # Measure copilot-instructions.md (must be ≤ 4 KB)
   wc -c .github/copilot-instructions.md
   
   # Measure each agent (must be ≤ 12 KB)
   wc -c .github/agents/*.agent.md
   
   # Measure each instruction (must be ≤ 6 KB)
   wc -c .github/instructions/*.instructions.md
   
   # Estimate co-loading: which instructions match *.java files?
   # Total matching instructions should be ≤ 20 KB
   ```
   If any file exceeds its budget:
   - `copilot-instructions.md` > 4 KB → move domain details to `.instructions.md`, move workflows to skills
   - `.instructions.md` > 6 KB → split into domain-scoped files or move detail to skills
   - `.agent.md` > 12 KB → extract detailed workflows into a corresponding skill

> **If any validation fails**: Fix the issue immediately. Do NOT proceed to output summary with broken config.

## Step 10: DevContainer Setup

**If project HAS `.devcontainer/`**:
- Review and optimize the existing configuration for performance, security, and DX
- Output: health score, findings by severity, performance recommendations

**If project does NOT have `.devcontainer/`**:
1. Ask the user: "Your project doesn't have a devcontainer configuration. Would you like me to generate one based on your detected tech stack: **[detected stack]**?"
2. If yes → generate optimized `devcontainer.json`, `Dockerfile`, `docker-compose.yml` (as needed)
3. If no → skip and report "DevContainer setup: skipped (user declined)"

> This step runs BEFORE cleanup so all toolkit agents are still available for generation.

## Step 11: Output Summary

Present the output adapted to project size:

**Small/Medium project output:**
```
✅ Bootstrap Complete!

📁 .github/
├── copilot-instructions.md          ← Project context + domain rules + usage guide
├── agents/                          ← [5-8] agents
├── skills/                          ← [5-8] skills
├── instructions/                    ← [5-10] instruction files
├── prompts/                         ← [3-6] prompts
├── hooks/                           ← [1-3] hook files
└── workflows/                       ← (if applicable)

Project Size: Small/Medium ([X] source files, [Y] domains)
Tech Stack: [detected]
Architecture: [detected]
```

**Large/Enterprise project output:**
```
✅ Bootstrap Complete!

📁 .github/
├── copilot-instructions.md          ← Index card + domain map + usage guide (≤ 4 KB)
├── agents/                          ← [8-12] agents (reference domain instructions)
│   ├── [list each agent]
├── skills/                          ← [8-15] skills (domain-aware workflows)
│   ├── [list each skill]
├── instructions/                    ← [10-20+] instruction files
│   ├── java.instructions.md                    ← Universal conventions
│   ├── java-order-domain.instructions.md       ← Order domain rules
│   ├── java-payment-domain.instructions.md     ← Payment domain rules
│   ├── [... domain-scoped per detected domain]
│   ├── [... framework + testing + build instructions]
├── prompts/                         ← [5-10] prompts
├── hooks/                           ← [1-3] hook files
└── workflows/                       ← (if applicable)

Project Size: Large/Enterprise ([X] source files, [Y] domains, [Z] modules)
Tech Stack: [detected]
Architecture: [detected]
Domain-Scoped Instructions: [count] domains with dedicated instruction files
Context Budget: copilot-instructions.md=[size], avg instruction=[size], largest agent=[size]
```

**Common footer for both:**
```
💡 Quick Start:
- Use `@dev-orchestrator` for any development task (auto-routes to the right agent)
- Use `/implement-feature` to implement a feature end-to-end
- Use `/learn-codebase` to onboard to this project
- See the "Available Agents & How to Use" section in copilot-instructions.md for the full reference
```

## Step 12: Cleanup Bootstrap Files

After generating project-specific configuration, **delete all generic bootstrap toolkit files** that are no longer needed. The project now has its own tailored config.

### Files to DELETE

Remove these bootstrap-specific files (they were templates, the project now has its own):

**Generic agents** (keep only newly generated project-specific agents):
```bash
# Delete ALL files in .github/agents/ that were NOT just created in Step 3 (Agents)
# These are the bootstrap toolkit agents — delete them:
rm .github/agents/conductor.agent.md
rm .github/agents/codebase-analyzer.agent.md
rm .github/agents/investigator.agent.md
rm .github/agents/implementor.agent.md
rm .github/agents/dotnet-implementor.agent.md
rm .github/agents/python-implementor.agent.md
rm .github/agents/php-implementor.agent.md
rm .github/agents/test-specialist.agent.md
rm .github/agents/sequence-diagrammer.agent.md
rm .github/agents/code-reviewer.agent.md
rm .github/agents/mock-data-specialist.agent.md
rm .github/agents/agent-generator.agent.md
rm .github/agents/mobile-implementor.agent.md
rm .github/agents/mobile-test-specialist.agent.md
rm .github/agents/mobile-architect.agent.md
rm .github/agents/dev-orchestrator.agent.md
rm .github/agents/sprint-planner.agent.md
rm .github/agents/refactoring-specialist.agent.md
rm .github/agents/pr-manager.agent.md
rm .github/agents/devcontainer-reviewer.agent.md
```

**Generic skills** (keep only newly generated project-specific skills):
```bash
# Delete ALL skill folders that were NOT just created in Step 4 (Skills)
rm -rf .github/skills/analyze-codebase/
rm -rf .github/skills/conventional-commit/
rm -rf .github/skills/estimate-effort/
rm -rf .github/skills/generate-adr/
rm -rf .github/skills/generate-agentic-workflow/
rm -rf .github/skills/generate-copilot-config/
rm -rf .github/skills/generate-hooks/
rm -rf .github/skills/generate-mobile-tests/
rm -rf .github/skills/generate-pr-description/
rm -rf .github/skills/generate-sequence-diagram/
rm -rf .github/skills/generate-unit-tests/
rm -rf .github/skills/generate-wiremock/
rm -rf .github/skills/implement-feature/
rm -rf .github/skills/implement-mobile-feature/
rm -rf .github/skills/investigate-pbi/
rm -rf .github/skills/optimize-devcontainer/
rm -rf .github/skills/orchestrate-development/
rm -rf .github/skills/review-code-changes/
rm -rf .github/skills/sprint-planning/
rm -rf .github/skills/technical-debt-analysis/
```

**Generic instructions** (keep only newly generated project-specific instructions):
```bash
# Delete ALL instruction files that were NOT just created in Step 5 (Instructions)
rm .github/instructions/android.instructions.md
rm .github/instructions/api-design.instructions.md
rm .github/instructions/database-migration.instructions.md
rm .github/instructions/devcontainer.instructions.md
rm .github/instructions/dotnet.instructions.md
rm .github/instructions/error-handling.instructions.md
rm .github/instructions/gradle.instructions.md
rm .github/instructions/ios.instructions.md
rm .github/instructions/jakartaee.instructions.md
rm .github/instructions/java.instructions.md
rm .github/instructions/kotlin.instructions.md
rm .github/instructions/logging.instructions.md
rm .github/instructions/maven.instructions.md
rm .github/instructions/oracle-sql.instructions.md
rm .github/instructions/php.instructions.md
rm .github/instructions/python.instructions.md
rm .github/instructions/security.instructions.md
rm .github/instructions/swift.instructions.md
rm .github/instructions/testing.instructions.md
rm .github/instructions/wiremock.instructions.md
```

**Bootstrap prompts** (replace with project-specific prompts from Step 6):
```bash
# Delete ALL prompt files that were NOT just created in Step 6 (Prompts)
# These are the bootstrap toolkit prompts — delete them:
rm .github/prompts/bootstrap-copilot.prompt.md
rm .github/prompts/analyze-project.prompt.md
rm .github/prompts/generate-agents.prompt.md
rm .github/prompts/generate-instructions.prompt.md
rm .github/prompts/generate-skills.prompt.md
rm .github/prompts/implement-feature.prompt.md
rm .github/prompts/learn-codebase.prompt.md
# NOTE: Keep newly generated project-specific prompts from Step 6
```

**Bootstrap hooks** (generic hooks are replaced by project-specific ones):
```bash
# Delete bootstrap hook files that were NOT just created in Step 7 (Hooks)
# Keep only newly generated project-specific hooks
rm -rf .github/hooks/  # Then recreate with project-specific hooks from Step 7
```

**Bootstrap documentation** (not relevant to the target project):
```bash
# Only delete if it exists and is the bootstrap README, not the project's README
# Check if README.md contains "Copilot Bootstrap Toolkit" — if yes, delete it
rm README.md  # Only the bootstrap toolkit README
```

### Cleanup Logic

**IMPORTANT:** Do NOT blindly delete. Follow this logic:

1. **List all files you just generated** (Steps 2-7) — these are the KEEP list
2. **List all existing files** in `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.github/prompts/`
3. **Delete files that are NOT in the KEEP list** — these are the bootstrap templates
4. **Delete bootstrap prompts** that were NOT generated in Step 6 — keep project-specific prompts
5. **Always delete** `.github/hooks/` and recreate with project-specific hooks from Step 7
6. **Replace** `.github/copilot-instructions.md` — the new one overwrites the bootstrap one
7. If a bootstrap agent/skill/instruction/prompt has the **same name** as a newly generated one, the new one already overwrote it — no action needed

### Output After Cleanup

```
🧹 Cleanup Complete!

Deleted [X] bootstrap agents
Deleted [X] bootstrap skills  
Deleted [X] bootstrap instructions
Deleted [X] bootstrap prompts (replaced with [Y] project-specific prompts)
Deleted bootstrap hooks/

Remaining .github/ structure (project-specific only):
📁 .github/
├── copilot-instructions.md    ← [project name] context + usage guide
├── agents/                    ← [X] tailored agents
├── skills/                    ← [X] tailored skills
├── instructions/              ← [X] tailored instructions
├── prompts/                   ← [X] tailored prompts
└── hooks/                     ← [X] tailored hooks
```
