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

Create `.github/agents/*.agent.md` (≤ 10 KB each).

**Always generate:**
- `dev-orchestrator` — single entry point, auto-routes to sub-agents
- `code-reviewer` — PR/code review with severity ratings

**Generate based on detection:**

| Detection | Agents to Generate |
|---|---|
| Any project | `implementor` (stack-specific), `test-specialist` |
| Database / migrations | `database-specialist` |
| Complex domains (5+ entities/domain) | `investigator`, `sequence-diagrammer` |
| WireMock / external APIs | `mock-data-specialist` |
| 10+ modules / Enterprise | `dependency-analyzer`, `codebase-analyzer` |
| Multiple tech stacks | Stack-specific implementors (dotnet, python, php, frontend) |
| Mobile platform detected | `mobile-implementor`, `mobile-test-specialist`, `mobile-architect` |

**Dev Orchestrator wiring (CRITICAL):** The generated `dev-orchestrator.agent.md` MUST have `agents:` field listing ALL other generated agent names, so it can auto-delegate.

## Phase 8: GEN Skills

Create `.github/skills/[name]/SKILL.md` (≤ 15 KB each).

**Auto-select based on detected capabilities:**

| Detection | Skills to Generate |
|---|---|
| Any project | `implement-feature`, `generate-unit-tests`, `review-code-changes` |
| CI/CD pipeline exists | `generate-pr-description`, `conventional-commit` |
| 3+ modules | `orchestrate-development`, `investigate-pbi`, `estimate-effort` |
| Sprint/agile tool references (Jira, Azure DevOps) | `sprint-planning` |
| Complex domain (5+ entities/domain) | `generate-sequence-diagram`, `generate-adr` |
| WireMock / mock dependencies | `generate-wiremock` |
| `.devcontainer/` exists or requested | `optimize-devcontainer` |
| Enterprise classification | `domain-registry`, `impact-analysis`, `context-budget-check` |
| Tech debt indicators (TODOs, deprecated code) | `technical-debt-analysis` |

## Phase 9: GEN Prompts

Create `.github/prompts/*.prompt.md` (≤ 3 KB each):
- Always: `bootstrap-copilot`, `analyze-project`, `implement-feature`
- If complex codebase: `learn-codebase`
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

Delete bootstrap toolkit files, keep only project-specific generated config.

Output:
```
✅ Bootstrap Complete!
📁 .github/
├── copilot-instructions.md
├── agents/ ([count] agents)
├── skills/ ([count] skills)
├── instructions/ ([count] instruction files)
├── prompts/ ([count] prompts)
└── hooks/ ([count] hooks)

🐳 .devcontainer/ (if generated)

Classification: [Small/Standard/Enterprise]
Domains detected: [count]
Context budget: [worst-case KB] / 45 KB max
Validation: [passed/N issues fixed]
```

🧹 Cleanup:
- Deleted [N] bootstrap agents
- Deleted [N] bootstrap skills  
- Deleted [N] bootstrap instructions
- Deleted bootstrap prompts/
- Created [N] project-specific configs
