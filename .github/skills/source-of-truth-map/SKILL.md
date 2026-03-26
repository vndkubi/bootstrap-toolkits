---
name: source-of-truth-map
description: "Scan the .github/ and docs/ directories to generate SOURCE-OF-TRUTH.md — a persistent map of which files are canonical for each domain, instruction scope, and agent-skill reference. Use as a foundation before running context-assembly-simulator or when onboarding a new contributor. Keywords: source of truth, canonical files, domain map, instruction scope map."
---

# Source of Truth Map

Scan the workspace and write `.github/SOURCE-OF-TRUTH.md` — a persistent index that maps each domain, agent, and instruction scope to its canonical files.

## When to Use

- After `/bootstrap-copilot` generates the initial `.github/` config
- Before running `context-assembly-simulator` (it uses this map as input)
- When adding new domains, agents, or instruction files
- When a contributor asks "which file owns rule X?"
- Keywords: source of truth, canonical file, instruction scope, domain map, regenerate map

## Output

Writes `.github/SOURCE-OF-TRUTH.md` to disk. Regenerate whenever domain structure changes.

---

## Step 1: Scan .github/ Structure

List all files in `.github/`:

| Subdirectory | File Pattern | Category |
|---|---|---|
| `.github/` root | `copilot-instructions.md` | Global instructions |
| `.github/agents/` | `*.agent.md` | Agent definitions |
| `.github/instructions/` | `*.instructions.md` | Scoped instructions |
| `.github/skills/*/` | `SKILL.md` | Skill workflows |
| `.github/prompts/` | `*.prompt.md` | Prompt entry points |
| `.github/` root | `constitution.md` | Governance |
| `.github/templates/` | `*.md` | Templates |

---

## Step 2: Build Domain Map

For each `.instructions.md` file, read frontmatter:

```yaml
---
applyTo: '**/*.java'
description: "..."
---
```

Group by tech domain. Handle comma-separated `applyTo`:

```yaml
applyTo: "**/*.cs, **/*.csproj, **/*.razor"
```

Split on `,`, trim whitespace, record each glob separately.

Produce table:

```markdown
| Domain | Instruction File | applyTo Scope |
|--------|-----------------|---------------|
| Java   | java.instructions.md | **/*.java |
| .NET   | dotnet.instructions.md | **/*.cs, **/*.csproj, **/*.razor |
```

---

## Step 3: Build Agent → Skill Reference Map

For each `.agent.md` file:

1. Read `name` and `description` from frontmatter
2. Scan body for skill references (lines containing skill folder names or SKILL.md paths)
3. Record which skills each agent uses

Produce table:

```markdown
| Agent | Purpose Summary | Skills Referenced |
|-------|----------------|-------------------|
| dev-orchestrator | Routes and coordinates | orchestrate-development, specify-feature, ... |
| implementor | Java implementation | generate-unit-tests, impact-analysis, ... |
```

---

## Step 4: Build Governance and Template Map

List:
- `constitution.md` — governance rules, Phase -1 gates
- `templates/*.md` — PRD, API contract, DB schema templates
- Any `docs/*.md` — architecture docs, playbooks, runbooks

---

## Step 5: Write SOURCE-OF-TRUTH.md

Write to `.github/SOURCE-OF-TRUTH.md`:

```markdown
# Source of Truth Map
_Generated: <date>. Regenerate when domain structure changes._

## Global Instructions
- `.github/copilot-instructions.md` — repo-wide rules, loaded every request

## Instruction Scope Map
| Domain | File | Applies To |
|--------|------|-----------|
| ...    | ...  | ...       |

## Agent Registry
| Agent | File | Skills Used |
|-------|------|------------|
| ...   | ...  | ...        |

## Skill Catalog
| Skill | File | Purpose |
|-------|------|---------|
| ...   | ...  | ...     |

## Governance & Templates
| File | Purpose |
|------|---------|
| constitution.md | Phase -1 gates, articles I-VI |
| templates/PRD-template.md | Feature spec template |
| ...  | ...     |

## Docs & Architecture
| File | Covers |
|------|--------|
| ...  | ...    |
```

---

## Verification

After generating:
- Confirm at least one entry per category (agents, instructions, skills)
- Confirm `applyTo` values are normalized (no trailing spaces)
- File should be ≤ 3 KB for a standard bootstrap kit
