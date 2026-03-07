---
name: generate-copilot-config
description: 'Complete GitHub Copilot configuration generator. Runs the full bootstrap pipeline: analyzes codebase structure and tech stack, generates copilot-instructions.md with project context, creates custom agents tailored to detected frameworks, generates task-specific skills for development workflows, produces language-specific instructions with applyTo patterns, creates hooks for automation, and validates all output. Use when asked to bootstrap Copilot, generate Copilot configuration, or set up Copilot for a new project.'
---

# Generate Complete Copilot Configuration

Full bootstrap pipeline that produces a complete `.github/` configuration from codebase analysis.

## When to Use

- Setting up Copilot for a new project
- Improving existing Copilot configuration
- Migrating a project to use custom agents/skills

## Pipeline

### Phase 1: Analyze Codebase

Run the `analyze-codebase` skill or delegate to `@codebase-analyzer`:
- Project structure, languages, frameworks, versions
- Architecture pattern, domain map
- Coding conventions, testing approach
- CI/CD, infrastructure, external dependencies

### Phase 2: Generate copilot-instructions.md

Create `.github/copilot-instructions.md` with:
- Project name, purpose, architecture overview
- Build/test/lint commands (from pom.xml, Makefile, package.json)
- Core coding standards (from analyzed conventions)
- Key patterns to follow and avoid
- Domain overview (for large projects)

**Business Domain Context** (CRITICAL for quality output):
- **Domain Glossary**: Key business terms extracted from entity names, enums, constants, service methods, and documentation
- **Business Rules Summary**: Core business rules discovered in service/validator classes — what they enforce and where in the codebase
- **Entity Relationship Map**: How business entities relate to each other with business-meaningful descriptions (not just FK relationships)
- **Business Workflows**: Key processes and state transitions (e.g., order lifecycle: DRAFT → SUBMITTED → APPROVED → SHIPPED → COMPLETED)
- **Business Invariants**: Data consistency rules with business justification (e.g., "sum of line items must equal order total")

This domain context enables all agents to make business-aware decisions when implementing, testing, investigating, or reviewing code.

### Phase 3: Generate Agents

Create `.github/agents/*.agent.md`:
- Always: `code-reviewer`, `test-specialist`, `implementor`
- If API detected: `api-developer`
- If DB detected: `database-specialist`
- If CI/CD detected: `devops-engineer`
- If WireMock detected: `mock-data-specialist`
- If complex domains: `investigator`, `sequence-diagrammer`

### Phase 4: Generate Skills

Create `.github/skills/[name]/SKILL.md`:
- Always: `project-setup`, `code-quality-check`, `prepare-pr`
- If test framework: `generate-unit-tests`
- If API: `create-api-endpoint`
- If DB: `database-migration`
- If WireMock: `generate-wiremock`
- If complex flows: `generate-sequence-diagram`

### Phase 5: Generate Instructions

Create `.github/instructions/*.instructions.md`:
- Per-language with appropriate `applyTo` glob
- Per-framework for major frameworks detected
- Testing instructions for test files
- Domain-specific for large codebases

### Phase 6: Generate Hooks

Create `.github/hooks/*.json` for lifecycle automation during agent sessions.

**Detect project tooling and generate appropriate hooks:**

| Detection | Hook File | Event | Purpose |
|-----------|-----------|-------|---------|
| Formatter (Prettier/Spotless/Black/ktlint) | `auto-format.json` | `postToolUse` | Auto-format after every file edit |
| Linter (ESLint/Checkstyle/PMD/detekt) | `lint-check.json` | `agentStop` | Lint check when agent finishes |
| Build tool (Maven/Gradle/tsc) | `compile-check.json` | `agentStop` | Verify compilation when agent finishes |
| Enterprise/security patterns | `security-gate.json` | `preToolUse` | Block dangerous commands |

**Hook file format:**
```json
{
  "version": 1,
  "hooks": {
    "<event>": [
      {
        "type": "command",
        "bash": "<unix command>",
        "powershell": "<windows command>",
        "cwd": ".",
        "timeoutSec": 30
      }
    ]
  }
}
```

**Rules:**
- Provide both `bash` and `powershell` for cross-platform support
- Keep `postToolUse` hooks fast (< 30s)
- Non-zero exit code blocks the triggering action
- Use `agentStop` for heavier checks that only need to run once

### Phase 7: Validate & Report

Verify:
- [ ] All agent files have valid frontmatter
- [ ] All skill descriptions are 10-1024 chars
- [ ] All instruction applyTo patterns are valid globs
- [ ] No duplicates or contradictions
- [ ] References actual tech stack

### Phase 8: DevContainer Setup

Runs **BEFORE cleanup** so bootstrap toolkit agents (`@devcontainer-reviewer`) are still available.

Check if `.devcontainer/devcontainer.json` or `.devcontainer.json` exists in the project.

**If devcontainer EXISTS**: Delegate to `@devcontainer-reviewer` to review and optimize:
- Audit the existing configuration (image pinning, Features, lifecycle scripts, performance, security, DX)
- Output: health score (X/10), severity-rated findings, optimized devcontainer.json
- Apply fixes if user approves

**If devcontainer does NOT exist**: Ask the user:

> "Your project doesn't have a devcontainer configuration. Would you like me to generate one for development environment setup? This will create devcontainer.json (and Dockerfile/docker-compose.yml if needed) based on your detected tech stack: **[detected stack]**."

**If user says yes:**
1. **Requirements interview** — use `optimize-devcontainer` skill Phase 0 questions:
   - What databases / services do you need? (PostgreSQL, Redis, Kafka, etc.)
   - What's your team's primary OS? (affects volume mount strategy)
   - How much RAM/CPU can be allocated to Docker?
   - Any must-have VS Code extensions beyond the language pack?
   - Preferred shell? (bash, zsh + oh-my-zsh, fish)
   - Docker-in-Docker needed? CI tools needed locally?
2. **Resource estimation** — calculate and present total RAM/CPU/disk needs:
   | Component | RAM (Min) | RAM (Recommended) | Disk |
   |-----------|-----------|-------------------|------|
   | [detected stack] | X GB | Y GB | Z GB |
   | [each service] | X MB | Y MB | Z GB |
   | **TOTAL** | **X GB** | **Y GB** | **Z GB** |
3. **Wait for user confirmation** — if resources are tight, propose lighter alternatives
4. **Generate files**:
   - `.devcontainer/devcontainer.json` — optimized for detected stack with Features, lifecycle scripts, volumes, extensions, settings
   - `.devcontainer/Dockerfile` — if custom image needed (multi-stage, additional tools)
   - `.devcontainer/docker-compose.yml` — if databases/services are needed
   - `.devcontainer/.dockerignore` — exclude build artifacts, .git, node_modules
5. **Present configuration** with inline comments explaining every property

**If user says no:**
Skip and include in final report: "DevContainer setup: skipped (user declined)"

### Phase 9: Cleanup & Final Report

After devcontainer setup (or skip), delete bootstrap toolkit files and output final summary:

Output summary:
```
✅ Bootstrap Complete!
📁 .github/
├── copilot-instructions.md
├── agents/ ([count] agents)
├── skills/ ([count] skills)
├── instructions/ ([count] instruction files)
└── hooks/ ([count] hooks)

🐳 .devcontainer/                        ← (if generated or optimized)
├── devcontainer.json               ← [stack] development environment
├── Dockerfile                      ← Custom image with [tools]
├── docker-compose.yml              ← [services list]
└── .dockerignore

Resource Estimate: ~[X] GB RAM / [Y] CPU cores / [Z] GB disk
```

🧹 Cleanup:
- Deleted [N] bootstrap agents
- Deleted [N] bootstrap skills
- Deleted [N] bootstrap instructions
- Deleted bootstrap prompts/
- Created [N] project-specific hooks
