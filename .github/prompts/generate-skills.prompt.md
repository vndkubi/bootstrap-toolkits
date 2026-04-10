---
agent: 'Agent Generator'
description: 'Generate reusable workflow skills from current codebase patterns. Detects developer workflows like testing, implementation, review, and deployment, then creates SKILL.md files with step-by-step instructions.'
---

# Generate Workflow Skills

Create `.github/skills/[name]/SKILL.md` files based on developer workflows detected in the current codebase.

## Step 1: Classify Skills by Retention Tier

Before detecting workflows, understand the four skill retention tiers:

| Tier | Retention Rule | Description |
|------|---------------|-------------|
| **Core** | Always retained | Essential workflow skills required by core agents |
| **Universal** | Always retained | Stack-agnostic process, planning, learning, and diagramming skills |
| **Conditional** | Evidence-gated | Stack-specific or infrastructure-specific skills |
| **Bootstrap-only** | Always removed | Skills used only during bootstrap pipeline |

### Core Skills (always generate)
| Skill | Rationale |
|-------|-----------|
| `orchestrate-development` | Required by dev-orchestrator |
| `implement-feature` | Required by implementor agent |
| `generate-unit-tests` | Required by test-specialist |
| `review-code-changes` | Required by code-reviewer |

### Universal Skills (always generate — not tied to any stack)

These have no codebase detection signal because they are process skills. Always retain them.

| Skill | Category |
|-------|----------|
| `learn-codebase` | Onboarding |
| `generate-adr` | Documentation |
| `sprint-planning` | Planning |
| `estimate-effort` | Planning |
| `specify-feature` | Spec pipeline |
| `plan-implementation` | Spec pipeline |
| `generate-tasks` | Spec pipeline |
| `review-spec` | Spec pipeline |
| `update-spec` | Spec pipeline |
| `technical-debt-analysis` | Analysis |
| `refine-user-input` | Meta |
| `analyze-requirements` | Requirements |
| `investigate-pbi` | Investigation |
| `generate-sequence-diagram` | Visualization |
| `generate-state-diagram` | Visualization |
| `impact-analysis` | Analysis |
| `conventional-commit` | Utilities |
| `generate-pr-description` | Utilities |
| `core-principles` | Utilities |

### Meta/Toolkit Skills (retain selectively for re-bootstrapping)

These are ongoing maintenance and quality-audit skills. They are not bootstrap-only unless explicitly classified that way.

| Skill | Default |
|-------|---------|
| `generate-copilot-config` | Retained for re-bootstrapping |
| `analyze-codebase` | Retained for re-analysis |
| `drift-detector` | Retained for config freshness checks |
| `repo-memory-promoter` | Retained for repo-memory audits and promotion planning |
| `review-memory-promotion` | Retained for approval-ready memory candidate generation |
| `review-effectiveness` | Retained for periodic workflow health checks |
| `context-assembly-simulator` | Retained for debug and optimization |
| `context-budget-check` | Retained for validation |
| `instruction-conflict-detector` | Retained for validation |
| `tool-permission-auditor` | Retained for validation |
| `skill-discoverability-audit` | Retained for validation |

Treat the example tables as guidance, not a closed whitelist. If a new runtime maintenance skill is added later, classify it into Core, Universal, Conditional, or Meta/Toolkit and retain it accordingly instead of defaulting it to bootstrap-only.

## Step 2: Detect Conditional Workflows

Analyze the project to identify **stack-specific** workflows that warrant additional skills:

### Conditional Workflows (generate only when detected)
| Detection Signal | Skill to Create |
|-----------------|----------------|
| Android/iOS source code | `implement-mobile-feature`, `generate-mobile-tests` |
| WireMock/MockServer stubs detected | `generate-wiremock` |
| `.devcontainer/` directory exists | `optimize-devcontainer` |
| Build/lint/format tooling detected | `generate-hooks` |
| CI/CD pipelines + automation need | `generate-agentic-workflow` |
| Enterprise classification or 5+ domains | `generate-domain-instructions`, `domain-registry` |
| Multi-module repo | `dependency-extractor` |

## Step 3: Analyze Existing Patterns

For each workflow to create:
1. Find existing examples in the codebase (how is this workflow done today?)
2. Read test files to understand testing patterns
3. Read build files for build/deploy commands
4. Read README and docs for documented procedures

## Step 4: Create Skill Files

### Skill File Format

Each skill is a folder with a `SKILL.md` inside:

```
.github/skills/
├── skill-name/
│   ├── SKILL.md              # Main skill definition (REQUIRED)
│   ├── references/             # Optional: example files
│   └── templates/              # Optional: code templates
```

### SKILL.md Format

```markdown
---
name: skill-name-in-kebab-case
description: '[WHAT it does]. [WHEN to use it]. [KEYWORDS for discovery]. Must be 10-1024 characters.'
---

# Skill Title

## When to Use

- [Condition 1 that triggers this skill]
- [Condition 2]
- [Trigger phrases users might say]

## Prerequisites

- [What must exist before this skill runs]
- [Required context or prior analysis]

## Workflow

### Step 1: [Action Name]
[Detailed instructions for step 1]

### Step 2: [Action Name]
[Detailed instructions for step 2]

### Step N: [Action Name]
[Final step]

## Validation Checklist

- [ ] [Verification item 1]
- [ ] [Verification item 2]
```

### Frontmatter Rules

| Field | Requirements |
|-------|-------------|
| `name` | kebab-case, max 64 characters, globally unique |
| `description` | 10-1024 characters, format: WHAT + WHEN + KEYWORDS |

### Description Best Practices

The `description` is used for **agent skill discovery** — it determines when the skill is auto-selected. Include:

1. **WHAT**: What the skill does (first sentence)
2. **WHEN**: When to use it (second sentence)
3. **KEYWORDS**: Terms that trigger discovery

**Example:**
```
'Generate comprehensive unit tests for Java classes with minimal mocking. Analyzes all code branches, creates test builders, and outputs JUnit 5 tests with full coverage. Use when asked to write tests, improve coverage, or generate tests for existing code.'
```

## Step 5: Customize to Project Patterns

For each skill, read the actual codebase and include:
- Real package names and class naming patterns
- Real build commands (`mvn`, `gradle`, `npm`, `xcodebuild`)
- Real test frameworks and assertion libraries used
- Real architecture layers and their responsibilities
- Real directory structure and conventions

## Step 6: Validate

For each skill file:
- [ ] `name` is kebab-case, max 64 characters
- [ ] `description` is 10-1024 characters
- [ ] Description contains WHAT + WHEN + trigger KEYWORDS
- [ ] Workflow steps are specific and actionable (not generic)
- [ ] References patterns actually used in this codebase
- [ ] Validation checklist items are verifiable
- [ ] Folder name matches the `name` field

## Output

List all created skills:
```
🎯 Skills Generated:
├── [skill-name]/ — [brief description]
├── ...
```
