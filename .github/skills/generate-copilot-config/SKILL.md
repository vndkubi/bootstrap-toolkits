---
name: generate-copilot-config
description: 'Complete GitHub Copilot configuration generator. Runs the full 14-phase bootstrap pipeline: deep codebase scan, project classification, business domain analysis, then generates copilot-instructions.md, domain-scoped instructions, language instructions, agents, skills, prompts, hooks, agentic workflows — with 3-tier validation. This is the SINGLE SOURCE OF TRUTH for the bootstrap pipeline. Use when asked to bootstrap Copilot, generate Copilot configuration, or set up Copilot for a new project.'
---

# Generate Complete Copilot Configuration — 14-Phase Pipeline

> **This file is the SINGLE SOURCE OF TRUTH for the bootstrap pipeline.**
> All other files (`bootstrap-copilot.prompt.md`, `conductor.agent.md`) reference this skill — they do NOT define their own pipeline.

## Pipeline Overview

```
Phase 1:  SCAN — Deep multi-stack codebase analysis
Phase 2:  CLASSIFY — Project size → Small / Standard / Enterprise
Phase 3:  DOMAIN — Business domain deep analysis (rules, glossary, workflows)
Phase 4:  GEN copilot-instructions.md (≤ 4 KB index card)
Phase 5:  GEN domain-scoped .instructions.md per domain (Enterprise only)
Phase 6:  GEN language/framework .instructions.md
Phase 7:  GEN agents (stack-specific + conditional + enterprise)
Phase 8:  GEN skills (auto-selected based on detected capabilities)
Phase 9:  GEN prompts (entry points, ≤ 3 KB each)
Phase 10: GEN hooks (format/lint/compile automation)
Phase 11: GEN agentic workflows (if CI/CD detected)
Phase 12: VALIDATE — structural + functional + context budget
Phase 13: DEVCONTAINER — review existing or generate new
Phase 14: CLEANUP & REPORT — delete bootstrap files, final summary
```

---

## Phase 1: SCAN — Deep Codebase Analysis

Delegate to `@codebase-analyzer` or use the `analyze-codebase` skill. This phase MUST be thorough.

**Minimum scan requirements:**
- [ ] Read ALL build config files (not just root — every module's pom.xml, every csproj, etc.)
- [ ] Sample ≥ 10 source files per detected domain (not 5 total)
- [ ] Read ALL entity/model classes
- [ ] Read ≥ 3 service classes per domain
- [ ] Read ≥ 3 test classes to detect test patterns
- [ ] Check for CI/CD, Docker, devcontainer configurations
- [ ] Scan for external service integrations (HTTP clients, message queues, event buses)

**Output**: Structured analysis report with: tech stack + versions, architecture pattern, module list, domain map, coding conventions, test patterns, infrastructure.

## Phase 2: CLASSIFY — Project Size

| Classification | Criteria | Strategy |
|---|---|---|
| **Small** | ≤ 5 source files, 1 module | Minimal: merged `copilot-instructions.md` + 1 implementor + 1 test agent |
| **Standard** | ≤ 100 files, 1-3 modules | Standard: + investigator, code-reviewer, dev-orchestrator |
| **Enterprise** | 5+ domains OR 10+ modules | Full suite + domain-scoped instructions + enterprise agents |

> This classification determines what gets generated in Phases 4-11. It MUST happen before generation.

## Phase 3: DOMAIN — Business Domain Deep Analysis

**CRITICAL for quality output.** Without this phase, agents produce technically correct but business-unaware code.

Extract from the codebase:
- **Domain Glossary**: Key business terms from entity names, enums, constants, service methods, documentation
- **Business Rules Summary**: Core rules from service/validator classes — what they enforce and where
- **Entity Relationship Map**: How entities relate with business-meaningful descriptions
- **Business Workflows**: Key processes and state transitions (e.g., DRAFT → SUBMITTED → APPROVED → SHIPPED)
- **Business Invariants**: Data consistency rules with justification (e.g., "sum of line items must equal order total")

## Phase 4: GEN copilot-instructions.md

Create `.github/copilot-instructions.md` (≤ 4 KB):
- Project name, purpose, architecture overview
- Build/test/lint commands (extracted from build configs)
- Core coding standards (from analyzed conventions)
- Key patterns to follow and anti-patterns to avoid
- Domain overview with glossary (for Standard/Enterprise)
- Module map with cross-references (for Enterprise)

## Phase 5: GEN Domain-Scoped Instructions (Enterprise only)

**Skip if Small or Standard.**

Use `domain-registry` skill to:
1. Auto-scan source code → detect domains
2. Generate `.github/domains/domain-registry.json`
3. Generate per-domain `.instructions.md` with narrow `applyTo` patterns
4. Each ≤ 4 KB with domain rules, entities, patterns, glossary

## Phase 6: GEN Language/Framework Instructions

Generate `.github/instructions/*.instructions.md` with correct `applyTo` globs:

| Detected Stack | Instruction Files to Generate |
|---|---|
| Java/Jakarta EE/Spring | `java.instructions.md`, `jakartaee.instructions.md` or `spring.instructions.md` |
| .NET/C# | `dotnet.instructions.md` |
| Python/Django/FastAPI | `python.instructions.md` |
| PHP/Laravel/Symfony | `php.instructions.md` |
| TypeScript/React | `typescript.instructions.md`, `react.instructions.md` |
| Android/Kotlin | `kotlin.instructions.md`, `android.instructions.md` |
| iOS/Swift | `swift.instructions.md`, `ios.instructions.md` |
| Maven/Gradle | `maven.instructions.md` or `gradle.instructions.md` |
| SQL / DB detected | `oracle-sql.instructions.md` or `database-migration.instructions.md` |
| Test framework detected | `testing.instructions.md` |
| WireMock detected | `wiremock.instructions.md` |

**Each file MUST**: reference conventions discovered in Phase 1, not generic placeholder text.

## Phase 7: GEN Agents

> **⚠️ ANTI-COPY RULE**: DELETE all existing `.github/agents/*.agent.md` files first. Then create NEW agent files with content specific to THIS project's tech stack, patterns, and conventions from Phases 1-3. Do NOT copy or reuse content from the bootstrap toolkit templates.

Use the `generate-agents` prompt as a guide for agent file format and detection logic.

Create `.github/agents/*.agent.md` (≤ 10 KB each). Each agent MUST:
- Reference the **actual tech stack** detected in Phase 1 (e.g., "Java 11, Jakarta EE 8, Maven" not "Java")
- Include **actual coding patterns** from Phase 1 (e.g., real package names, real class naming patterns)
- Include **actual business domain context** from Phase 3 (e.g., domain glossary terms, entity names)

**Always generate these core agents:**
- `dev-orchestrator` — single entry point with `agents:` field listing ALL generated agents
- `implementor` — stack-specific, referencing actual framework patterns
- `test-specialist` — using project's actual test framework and patterns
- `code-reviewer` — with project-specific review checklist

**Conditionally generate based on Phase 1 detection:**

| Detection | Agent | Must Include |
|---|---|---|
| Complex domains (5+ entities) | `investigator` | Actual domain entities and relationships |
| Multi-layer architecture | `sequence-diagrammer` | Actual layer structure |
| Database / migrations | `database-specialist` | Actual DB type and migration tool |
| WireMock / external APIs | `mock-data-specialist` | Actual API endpoints to mock |
| 10+ modules / Enterprise | `dependency-analyzer` | Actual module list and dependencies |
| Mobile platform | `mobile-implementor` | Platform-specific patterns |

**Dev Orchestrator wiring (CRITICAL):** The `dev-orchestrator.agent.md` `agents:` field MUST list ALL other generated agent names.

## Phase 8: GEN Skills

> **⚠️ ANTI-COPY RULE**: DELETE all existing `.github/skills/*/SKILL.md` directories first. Then create NEW skill directories with content specific to THIS project. Do NOT copy bootstrap toolkit skills.

Use the `generate-skills` prompt as a guide for skill file format and detection logic.

Create `.github/skills/[name]/SKILL.md` (≤ 15 KB each). Each skill MUST:
- Reference **actual build commands** (e.g., `mvn clean verify -pl module-name` not `build`)
- Reference **actual test commands** (e.g., `mvn test -Dtest=OrderServiceTest` not `run tests`)
- Reference **actual project directory structure** (e.g., `src/main/java/com/company/...`)
- Reference **actual framework patterns** (e.g., "Entity → DAO → Service → Resource" for Jakarta EE)

**Auto-select based on detected capabilities:**

| Detection | Skills to Generate |
|---|---|
| Any project | `implement-feature`, `generate-unit-tests`, `review-code-changes` |
| CI/CD pipeline exists | `generate-pr-description`, `conventional-commit` |
| 3+ modules | `orchestrate-development`, `investigate-pbi`, `estimate-effort` |
| Sprint/agile references | `sprint-planning` |
| Complex domain (5+ entities) | `generate-sequence-diagram` |
| WireMock / mock dependencies | `generate-wiremock` |
| Enterprise classification | `impact-analysis` |
| Tech debt indicators | `technical-debt-analysis` |

### Stack-Specific Skill Customization (CRITICAL)

Skills MUST contain stack-specific content. The same skill name produces DIFFERENT content depending on the detected tech stack.

**`implement-feature` — Implementation order per stack:**

| Stack | Implementation Order in Skill |
|---|---|
| Java / Jakarta EE | DB Migration → `@Entity` + JPA annotations → DAO (`@Stateless`) → Service (`@Inject`) → `@Path` Resource → CDI event |
| Java / Spring Boot | Migration → Entity → DTO + MapStruct → Repository → Service (`@Transactional`) → Controller → Config |
| .NET / ASP.NET Core | Entity + EF Config → Migration → DTO → FluentValidation → Repository → Service/MediatR Handler → Controller → DI registration |
| Python / Django | Model → Migration → Serializer → Service/Selector → View/ViewSet → URL config → Admin registration |
| Python / FastAPI | SQLAlchemy Model → Alembic Migration → Pydantic Schema → Repository → Service → Dependencies → Router |
| TypeScript / React | Types/Interfaces → API service → Custom Hook → Component → Storybook → Page route |
| TypeScript / Next.js | Types → Server Action or Route Handler → Data fetching → Component → Page → Layout |
| PHP / Laravel | Model + fillable/casts → Migration → FormRequest → API Resource → Service → Controller → Route |
| PHP / Symfony | Entity + ORM mapping → Migration → DTO → Validator → Repository → Service → Controller → Route annotation |
| Android / Kotlin | Room Entity + DAO → Repository → UseCase → ViewModel → Compose UI → Navigation → Hilt module |
| iOS / Swift | SwiftData Model → Repository → Service → ViewModel (`@Observable`) → SwiftUI View → Navigation |
| Kotlin Multiplatform | Shared: expect/actual → Repository → UseCase → Android ViewModel + iOS ObservableObject |

**`generate-unit-tests` — Test framework per stack:**

| Stack | Test Config in Skill |
|---|---|
| Java | JUnit 5 + `@Nested` + `@DisplayName` + AssertJ + Mockito (`@ExtendWith`) + `@ParameterizedTest` |
| .NET | xUnit + `[Fact]`/`[Theory]` + FluentAssertions + Moq + nested classes |
| Python | pytest + `@pytest.fixture` + `factory_boy` + `pytest-asyncio` + parametrize |
| TypeScript / React | Vitest or Jest + React Testing Library + `render()`/`screen`/`userEvent` + MSW for API mocks |
| PHP | PHPUnit or Pest + Model Factories + `RefreshDatabase` + mock facades |
| Android / Kotlin | JUnit 5 + Turbine (Flow testing) + MockK + Hilt test + Compose testing (`createComposeRule`) |
| iOS / Swift | XCTest + Swift Testing (`@Test`) + async/await testing + ViewInspector for SwiftUI |

**`review-code-changes` — Review focus per stack:**

| Stack | Review Focus Areas in Skill |
|---|---|
| Java / Jakarta EE | CDI scope correctness, JPA lazy/eager loading, transaction boundaries, JNDI naming |
| .NET | EF query performance (N+1), DI lifetime (Scoped/Transient/Singleton), async/await patterns |
| Python | Type hint completeness, async context managers, SQLAlchemy session handling, Pydantic validation |
| TypeScript / React | Hook dependency arrays, re-render optimization, proper error boundaries, accessibility |
| PHP | Eloquent N+1 (eager loading), mass assignment guards, middleware ordering |
| Android / Kotlin | Compose recomposition, coroutine scope lifecycle, state hoisting, memory leaks |
| iOS / Swift | Actor isolation, Sendable conformance, memory ownership (@Observable vs @State), accessibility |

## Phase 9: GEN Prompts

> **⚠️ ANTI-COPY RULE**: DELETE all existing `.github/prompts/*.prompt.md` files first. Create NEW prompts for this project.

Create `.github/prompts/*.prompt.md` (≤ 3 KB each):
- Always: `implement-feature` (entry point to dev-orchestrator)
- If complex codebase: `learn-codebase` (entry point to understand this project)
- Each prompt is an entry point only — delegates to agents + skills for real work

## Phase 10: GEN Hooks

Create `.github/hooks/*.json` based on detected project tooling:

| Detection | Hook File | Event | Purpose |
|---|---|---|---|
| Formatter (Prettier/Spotless/Black/ktlint) | `auto-format.json` | `postToolUse` | Auto-format after file edit |
| Linter (ESLint/Checkstyle/PMD/detekt) | `lint-check.json` | `agentStop` | Lint when agent finishes |
| Build tool (Maven/Gradle/tsc/dotnet) | `compile-check.json` | `agentStop` | Verify compilation |
| Enterprise/security patterns | `security-gate.json` | `preToolUse` | Block dangerous commands |

Hook format:
```json
{
  "version": 1,
  "hooks": {
    "<event>": [{
      "type": "command",
      "bash": "<unix command>",
      "powershell": "<windows command>",
      "cwd": ".",
      "timeoutSec": 30
    }]
  }
}
```

Rules: Both `bash` and `powershell` for cross-platform. `postToolUse` hooks < 30s. Non-zero exit blocks action.

## Phase 11: GEN Agentic Workflows

**Trigger**: `.github/workflows/` directory exists (GitHub Actions available).

If triggered, generate `.github/copilot/` workflow files:
- Issue triage workflow (label bugs, assign priority, suggest affected modules)
- Dependency audit workflow (weekly check for outdated/vulnerable deps)

**Skip** if no CI/CD directory is detected.

## Phase 12: VALIDATE — 3-Tier Validation

### Tier 1: Structural Validation
- [ ] All `.agent.md` have valid YAML frontmatter (`name`, `description`, `tools`)
- [ ] All `SKILL.md` have `name` and `description` (10-1024 chars)
- [ ] All `.instructions.md` have `description` and `applyTo` globs
- [ ] All `.prompt.md` have valid frontmatter
- [ ] No files with empty or placeholder content

### Tier 2: Functional Validation
- [ ] Each agent `description` mentions the actual tech stack detected in Phase 1
- [ ] Each instruction `applyTo` pattern matches ≥ 1 real file in the project
- [ ] `dev-orchestrator.agent.md` `agents:` field lists ALL generated agent names
- [ ] Each skill is referenced by at least one agent or prompt
- [ ] No agent references a sub-agent that wasn't generated
- [ ] Hooks reference commands that exist in the project (e.g., `mvn` if maven hook)
- [ ] No two instruction files have overlapping `applyTo` patterns covering the same rules

### Tier 3: Context Budget Validation
- [ ] `copilot-instructions.md` ≤ 4 KB
- [ ] Each `.instructions.md` ≤ 6 KB
- [ ] Each `.agent.md` ≤ 10 KB
- [ ] Each `.prompt.md` ≤ 3 KB
- [ ] Simulate worst-case co-loading: instructions + agent + skill ≤ 45 KB

**If any check fails**: fix immediately before proceeding. Report which checks failed and how they were resolved.

## Phase 13: DevContainer Setup

Runs BEFORE cleanup so bootstrap agents (`@devcontainer-reviewer`) are still available.

**If `.devcontainer/` exists**: Delegate to `@devcontainer-reviewer` to optimize.

**If no `.devcontainer/`**: Ask user if they want one generated. If yes:
1. Requirements interview (databases, services, tools, shell, extensions)
2. Resource estimation (RAM/CPU/disk)
3. Wait for user confirmation
4. Generate: `devcontainer.json`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`

**If user declines**: Skip, report "DevContainer: skipped"

## Phase 14: Cleanup & Final Report

> **This phase is CRITICAL.** The bootstrap toolkit ships with template files that were used DURING generation. ALL template files must be deleted. Only project-specific generated files remain.

### Step 1: Delete ALL Bootstrap Toolkit Template Files

**Delete these bootstrap template agents** (ALL of them — they are toolkit templates, NOT project agents):
```
.github/agents/agent-generator.agent.md
.github/agents/codebase-analyzer.agent.md
.github/agents/conductor.agent.md
.github/agents/devcontainer-reviewer.agent.md
.github/agents/dotnet-implementor.agent.md
.github/agents/frontend-implementor.agent.md
.github/agents/mobile-architect.agent.md
.github/agents/mobile-implementor.agent.md
.github/agents/mobile-test-specialist.agent.md
.github/agents/mock-data-specialist.agent.md
.github/agents/php-implementor.agent.md
.github/agents/pr-manager.agent.md
.github/agents/python-implementor.agent.md
.github/agents/refactoring-specialist.agent.md
.github/agents/sequence-diagrammer.agent.md
.github/agents/sprint-planner.agent.md
.github/agents/dependency-analyzer.agent.md
.github/agents/database-specialist.agent.md
```

**Delete these bootstrap template skills** (ALL skill directories):
```
.github/skills/analyze-codebase/
.github/skills/context-budget-check/
.github/skills/conventional-commit/
.github/skills/core-principles/
.github/skills/domain-registry/
.github/skills/estimate-effort/
.github/skills/generate-adr/
.github/skills/generate-agentic-workflow/
.github/skills/generate-copilot-config/
.github/skills/generate-domain-instructions/
.github/skills/generate-hooks/
.github/skills/generate-mobile-tests/
.github/skills/generate-pr-description/
.github/skills/generate-sequence-diagram/
.github/skills/generate-unit-tests/
.github/skills/generate-wiremock/
.github/skills/impact-analysis/
.github/skills/implement-feature/
.github/skills/implement-mobile-feature/
.github/skills/investigate-pbi/
.github/skills/learn-codebase/
.github/skills/optimize-devcontainer/
.github/skills/orchestrate-development/
.github/skills/review-code-changes/
.github/skills/sprint-planning/
.github/skills/technical-debt-analysis/
```

**Delete these bootstrap template instructions** (ALL of them):
```
.github/instructions/*.instructions.md  (all 23 files)
```

**Delete these bootstrap template prompts** (ALL of them):
```
.github/prompts/bootstrap-copilot.prompt.md
.github/prompts/generate-agents.prompt.md
.github/prompts/generate-skills.prompt.md
.github/prompts/generate-instructions.prompt.md
.github/prompts/analyze-project.prompt.md
.github/prompts/implement-feature.prompt.md
.github/prompts/learn-codebase.prompt.md
```

**Delete the bootstrap copilot-instructions.md** (replaced by project-specific version in Phase 4):
```
.github/copilot-instructions.md  (the template version)
```

**Delete bootstrap documentation:**
```
docs/enterprise-guide.md
docs/context-budget-guide.md
```

### Step 2: Verify Only Project-Specific Files Remain

After cleanup, `.github/` should contain ONLY files generated in Phases 4-11:
- `copilot-instructions.md` — generated in Phase 4, project-specific
- `agents/` — generated in Phase 7, project-specific
- `skills/` — generated in Phase 8, project-specific
- `instructions/` — generated in Phase 6, project-specific
- `prompts/` — generated in Phase 9, project-specific
- `hooks/` — generated in Phase 10, project-specific
- `domains/` — generated in Phase 5, Enterprise only

**Verification**: List all remaining files. If ANY file contains generic/template content (not referencing this project's actual tech stack, entities, or patterns), it was not properly generated — delete and regenerate.

### Step 3: Final Report

```
✅ Bootstrap Complete!
📁 .github/
├── copilot-instructions.md  ← [project name] index card
├── agents/ ([count] project-specific agents)
├── skills/ ([count] project-specific skills)
├── instructions/ ([count] instruction files)
├── prompts/ ([count] prompts)
└── hooks/ ([count] hooks)

🐳 .devcontainer/ (if generated)

Classification: [Small/Standard/Enterprise]
Domains detected: [count]
Context budget: [worst-case KB] / 45 KB max
Validation: [passed/N issues fixed]

🧹 Cleanup:
- Deleted [N] bootstrap template agents
- Deleted [N] bootstrap template skills
- Deleted [N] bootstrap template instructions
- Deleted [N] bootstrap template prompts
- Deleted bootstrap copilot-instructions.md + docs/
- Remaining: [N] project-specific generated files
```
