---
mode: 'agent'
description: 'Analyze current codebase and generate a complete GitHub Copilot configuration — agents, skills, instructions, and copilot-instructions.md. Full bootstrap pipeline from source code analysis to validated output.'
---

# Bootstrap GitHub Copilot Configuration

You are a Copilot Configuration Generator. Your task is to analyze the current codebase and generate a **complete** `.github/` configuration optimized for this project.

## Step 1: Analyze Codebase Structure

Scan the project root and explore all directories to identify:

### Tech Stack Detection
- **Languages**: Check file extensions (`.java`, `.kt`, `.swift`, `.ts`, `.py`, etc.)
- **Build tools**: `pom.xml` (Maven), `build.gradle.kts` (Gradle), `package.json` (Node), `Cargo.toml` (Rust), etc.
- **Frameworks**: Read build files for dependencies — Spring Boot, Jakarta EE, Quarkus, Android, iOS, React, etc.
- **Database**: Look for SQL files, JPA entities, Room entities, CoreData models, migration scripts
- **Testing**: Detect test frameworks from dependencies and existing test files
- **CI/CD**: Check `.github/workflows/`, `Jenkinsfile`, `.gitlab-ci.yml`, etc.

### Architecture Detection
- **Module structure**: Single module vs multi-module (check `settings.gradle.kts`, `pom.xml` modules)
- **Package organization**: Feature-based vs layer-based
- **Architecture pattern**: MVC, MVVM, Clean Architecture, Hexagonal, etc.
- **API patterns**: REST, GraphQL, gRPC

### Convention Detection
Read 3-5 representative source files per language to identify:
- Naming conventions (classes, methods, variables, packages)
- Import organization
- Error handling patterns
- Logging approach
- Documentation style
- DI approach (CDI, Hilt, manual, etc.)

### Domain Map (for large projects)
- Identify bounded contexts / feature domains
- Map cross-domain dependencies
- Note shared kernel / common modules

## Step 2: Generate copilot-instructions.md

Create `.github/copilot-instructions.md` containing:

```markdown
# [Project Name]

## Overview
[Brief project description based on README or observed structure]

## Tech Stack
- **Language**: [detected]
- **Framework**: [detected]
- **Build Tool**: [detected]
- **Database**: [detected]
- **Testing**: [detected]

## Architecture
[Detected architecture pattern and module structure]

## Build & Run
[Commands found in build files, Makefile, README, or scripts/]

## Key Conventions
[Top conventions detected from codebase analysis]

## Domain Map
[For multi-domain projects: domain boundaries and responsibilities]
```

## Step 3: Generate Agents

Create `.github/agents/` with agents tailored to the detected tech stack.

**Always create:**
- `implementor.agent.md` — Code implementation following project patterns
- `test-specialist.agent.md` — Unit tests with the detected test framework
- `code-reviewer.agent.md` — Code review with project standards

**Conditionally create based on detection:**
- If complex business logic → `investigator.agent.md` (PBI investigation)
- If multi-layer architecture → `sequence-diagrammer.agent.md`
- If REST/API detected → `api-specialist.agent.md`
- If database detected → `database-specialist.agent.md`
- If WireMock/mock server → `mock-data-specialist.agent.md`
- If Android/iOS detected → `mobile-implementor.agent.md`, `mobile-test-specialist.agent.md`
- If CI/CD pipelines → `devops-engineer.agent.md`

**Agent file format:**
```markdown
---
name: 'Agent Name'
description: 'Clear description of role and expertise (10-1024 chars)'
---

You are a [role]...
[Detailed instructions tailored to THIS project's patterns]
```

> **IMPORTANT**: Do NOT include `tools` field — this gives agents access to ALL available tools.

## Step 4: Generate Skills

Create `.github/skills/[name]/SKILL.md` for common workflows detected.

**Always create:**
- `implement-feature/SKILL.md` — Step-by-step implementation guide
- `generate-unit-tests/SKILL.md` — Test generation workflow
- `review-code-changes/SKILL.md` — Code review workflow

**Conditionally create:**
- If complex flows → `investigate-pbi/SKILL.md`, `generate-sequence-diagram/SKILL.md`
- If WireMock → `generate-wiremock/SKILL.md`
- If multiple entry points → `analyze-codebase/SKILL.md`

**Skill file format:**
```markdown
---
name: skill-name
description: 'What this skill does, when to use it, trigger keywords (10-1024 chars)'
---

# Skill Title

## When to Use
[Conditions and trigger phrases]

## Workflow
[Step-by-step instructions]
```

## Step 5: Generate Instructions

Create `.github/instructions/*.instructions.md` for each detected language/framework.

**Instruction file format:**
```markdown
---
description: 'What standards this covers'
applyTo: 'glob/pattern/**/*.ext'
---

# Standards Title

## Conventions
[Language-specific rules detected from codebase]

## Examples
[✅ Correct and ❌ Incorrect patterns]
```

**Common patterns:**
- `**/*.java` → Java coding standards
- `**/*.kt` → Kotlin standards
- `**/*.swift` → Swift standards
- `**/*.ts` or `**/*.tsx` → TypeScript standards
- `**/pom.xml` → Maven conventions
- `**/*.gradle.kts` → Gradle conventions
- `**/*Test*.java` → Testing standards
- `**/*.sql` → SQL standards

## Step 6: Generate Hooks

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

## Step 7: Validate

After generating all files, verify:
- [ ] All `.agent.md` files have valid `name` and `description` in frontmatter
- [ ] All `SKILL.md` files have `name` (kebab-case) and `description` (10-1024 chars)
- [ ] All `.instructions.md` files have `description` and valid `applyTo` glob
- [ ] All `.json` hook files have valid JSON with `"version": 1`
- [ ] `copilot-instructions.md` accurately reflects the project
- [ ] No hardcoded paths or project-specific assumptions that don't match
- [ ] Instructions reference real patterns found in the codebase
- [ ] Hook commands reference actual tools installed in the project

## Step 8: Output Summary

```
✅ Bootstrap Complete!

📁 .github/
├── copilot-instructions.md          ← Project context
├── agents/                          ← [X] agents created
│   ├── [list each agent]
├── skills/                          ← [X] skills created
│   ├── [list each skill]
├── instructions/                    ← [X] instruction files
│   ├── [list each instruction]
└── hooks/                           ← [X] hook files
    ├── [list each hook]

Tech Stack: [detected]
Architecture: [detected]
Domains: [count if multi-domain]
```

## Step 9: Cleanup Bootstrap Files

After generating project-specific configuration, **delete all generic bootstrap toolkit files** that are no longer needed. The project now has its own tailored config.

### Files to DELETE

Remove these bootstrap-specific files (they were templates, the project now has its own):

**Generic agents** (keep only newly generated project-specific agents):
```bash
# Delete ALL files in .github/agents/ that were NOT just created in Step 3
# These are the bootstrap toolkit agents — delete them:
rm .github/agents/conductor.agent.md
rm .github/agents/codebase-analyzer.agent.md
rm .github/agents/investigator.agent.md
rm .github/agents/implementor.agent.md
rm .github/agents/test-specialist.agent.md
rm .github/agents/sequence-diagrammer.agent.md
rm .github/agents/code-reviewer.agent.md
rm .github/agents/mock-data-specialist.agent.md
rm .github/agents/agent-generator.agent.md
rm .github/agents/mobile-implementor.agent.md
rm .github/agents/mobile-test-specialist.agent.md
rm .github/agents/mobile-architect.agent.md
rm .github/agents/dev-orchestrator.agent.md
```

**Generic skills** (keep only newly generated project-specific skills):
```bash
# Delete ALL skill folders that were NOT just created in Step 4
rm -rf .github/skills/analyze-codebase/
rm -rf .github/skills/investigate-pbi/
rm -rf .github/skills/implement-feature/
rm -rf .github/skills/generate-unit-tests/
rm -rf .github/skills/generate-sequence-diagram/
rm -rf .github/skills/review-code-changes/
rm -rf .github/skills/generate-wiremock/
rm -rf .github/skills/generate-copilot-config/
rm -rf .github/skills/implement-mobile-feature/
rm -rf .github/skills/generate-mobile-tests/
rm -rf .github/skills/orchestrate-development/
rm -rf .github/skills/generate-adr/
rm -rf .github/skills/generate-hooks/
```

**Generic instructions** (keep only newly generated project-specific instructions):
```bash
# Delete ALL instruction files that were NOT just created in Step 5
rm .github/instructions/java.instructions.md
rm .github/instructions/jakartaee.instructions.md
rm .github/instructions/maven.instructions.md
rm .github/instructions/oracle-sql.instructions.md
rm .github/instructions/testing.instructions.md
rm .github/instructions/wiremock.instructions.md
rm .github/instructions/kotlin.instructions.md
rm .github/instructions/swift.instructions.md
rm .github/instructions/android.instructions.md
rm .github/instructions/ios.instructions.md
rm .github/instructions/gradle.instructions.md
rm .github/instructions/api-design.instructions.md
rm .github/instructions/security.instructions.md
rm .github/instructions/logging.instructions.md
rm .github/instructions/error-handling.instructions.md
rm .github/instructions/database-migration.instructions.md
```

**Bootstrap prompts** (no longer needed after bootstrap completes):
```bash
rm -rf .github/prompts/
```

**Bootstrap hooks** (generic hooks are replaced by project-specific ones):
```bash
# Delete bootstrap hook files that were NOT just created in Step 6
# Keep only newly generated project-specific hooks
rm -rf .github/hooks/  # Then recreate with project-specific hooks from Step 6
```

**Bootstrap documentation** (not relevant to the target project):
```bash
# Only delete if it exists and is the bootstrap README, not the project's README
# Check if README.md contains "Copilot Bootstrap Toolkit" — if yes, delete it
rm README.md  # Only the bootstrap toolkit README
```

### Cleanup Logic

**IMPORTANT:** Do NOT blindly delete. Follow this logic:

1. **List all files you just generated** (Steps 2-5) — these are the KEEP list
2. **List all existing files** in `.github/agents/`, `.github/skills/`, `.github/instructions/`
3. **Delete files that are NOT in the KEEP list** — these are the bootstrap templates
4. **Always delete** `.github/prompts/` — bootstrap prompts are one-time use
5. **Always delete** `.github/hooks/` and recreate with project-specific hooks from Step 6
6. **Replace** `.github/copilot-instructions.md` — the new one overwrites the bootstrap one
7. If a bootstrap agent/skill/instruction has the **same name** as a newly generated one, the new one already overwrote it — no action needed

### Output After Cleanup

```
🧹 Cleanup Complete!

Deleted [X] bootstrap agents
Deleted [X] bootstrap skills  
Deleted [X] bootstrap instructions
Deleted bootstrap prompts/
Deleted bootstrap hooks/

Remaining .github/ structure (project-specific only):
📁 .github/
├── copilot-instructions.md    ← [project name] context
├── agents/                    ← [X] tailored agents
├── skills/                    ← [X] tailored skills
├── instructions/              ← [X] tailored instructions
└── hooks/                     ← [X] tailored hooks
```
