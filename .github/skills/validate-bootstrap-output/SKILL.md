---
name: validate-bootstrap-output
description: "Validate the quality of a bootstrapped Copilot configuration beyond structural checks. Tests that generated agents, skills, instructions, and cleanup decisions actually match the target project rather than leaving generic bootstrap residue."
---

# Validate Bootstrap Output

This skill runs deep quality validation on a bootstrapped `.github/` configuration, beyond the structural Phase 12 checks. It catches the most common failure: generated files that look valid but still contain generic placeholder or bootstrap-bundle content instead of project-specific guidance.

## When to Use

- After running `/bootstrap-copilot` to verify output quality
- After running `upgrade-config` to verify new files are project-specific
- When agents or skills seem to give generic responses that do not match the project
- When cleanup may have retained copied toolkit files that should have been deleted

## Validation Checklist

### Tier 1: Structural

Re-run Phase 12 checks from `generate-copilot-config`:

- [ ] All `.agent.md` files have valid `name` and `description` frontmatter
- [ ] No `tools:` or `mode:` fields appear in agent frontmatter
- [ ] All `SKILL.md` files have `name` and `description` (10-1024 chars)
- [ ] All `.instructions.md` files have `applyTo` patterns
- [ ] No empty or stub files remain
- [ ] Context budget is compliant

### Tier 2: Project-Specificity

For each generated file, verify it contains project-specific content, not generic bundle language.

Fail immediately if any of these red flags appear:

- Any agent description contains `your project`, `the codebase`, `detected tech stack`, `[tech stack]`, or `[framework]`
- Any instruction `applyTo` is `**/*`
- Any skill refers to `mvn clean install` when the project uses Gradle, npm, pnpm, etc.
- Any agent references entities such as `Order` or `Customer` that do not exist in the target project
- Any generated instruction file is byte-for-byte identical to a toolkit template
- `copilot-instructions.md` still identifies the target repo as the bootstrap toolkit or treats copied bundle inventory as the repo's normal final state

Project-specificity checks:

| File | What to Verify |
|---|---|
| `copilot-instructions.md` | Contains the actual project name, actual build commands, actual module names, and no toolkit-self identity mistake |
| `dev-orchestrator.agent.md` | `agents:` list matches all generated agents that remain after cleanup |
| Stack-specific implementor | References the actual stack, paths, and conventions from Phase 1 scan |
| `testing.instructions.md` | References the actual test framework detected |
| Domain instructions | `applyTo` patterns match real project paths |
| Skill files | Build, test, lint, and verification commands match the real project |

### Tier 3: Cross-Reference Integrity

- [ ] Every agent listed in `dev-orchestrator.agent.md` exists as a file
- [ ] Every skill referenced by an agent exists in `.github/skills/<name>/SKILL.md`
- [ ] Every `applyTo` pattern matches at least one real file when the instruction is kept
- [ ] Domain instruction patterns do not overlap for the same rules
- [ ] Run `instruction-conflict-detector` to verify no overlapping instruction files contain contradicting rules
- [ ] Run `tool-permission-auditor` to verify agents do not hold tool access beyond their declared role
- [ ] Run `skill-discoverability-audit` to verify all skills are discoverable via descriptions and routing tables
- [ ] Run `repo-memory-promoter` to detect underdocumented subsystems; use `common-doc-generator` for any H-3/H-5 candidates
- [ ] If `AGENTS.md` was generated: every agent listed exists as a file, and every generated agent appears in the index
- [ ] If nested `AGENTS.md` files exist: each lists only agents relevant to that module, not the full catalog

### Tier 4: Manifest And Cleanup Integrity

- [ ] `.github/.bootstrap-manifest.json` exists and is valid JSON
- [ ] Manifest keep entries match all files intentionally retained after cleanup
- [ ] Files outside the manifest keep set were deleted
- [ ] `contextBudget.passed` is `true`
- [ ] The full copied toolkit inventory was not retained unless non-bundle evidence proves the repo truly is the toolkit source repository

## Output Format

```md
## Bootstrap Output Validation Report

**Project**: [project name from copilot-instructions.md]
**Toolkit version**: [from manifest]
**Classification**: [Small | Standard | Enterprise | Framework / Library]
**Validated at**: [timestamp]

### Tier 1: Structural
| Check | Status | Notes |
|---|---|---|
| Frontmatter validity | PASS | All files valid |
| Empty files | PASS | None found |
| Context budget | PASS | 38 KB / 45 KB |

### Tier 2: Project-Specificity
| File | Status | Notes |
|---|---|---|
| copilot-instructions.md | PASS | Names actual stack and repo commands |
| dev-orchestrator.agent.md | WARN | One retained agent missing from agents list |
| testing.instructions.md | PASS | Matches Vitest conventions |

### Tier 3: Cross-Reference
| Check | Status | Notes |
|---|---|---|
| Agent references resolve | PASS | |
| Skill references resolve | PASS | |
| applyTo patterns match | WARN | One retained instruction matches 0 files |

### Tier 4: Manifest And Cleanup
| Check | Status | Notes |
|---|---|---|
| Manifest exists | PASS | |
| Keep set complete | WARN | 2 files retained but missing from manifest |
| Toolkit residue removed | FAIL | 14 copied toolkit files remain without justification |

### Recommendations
1. Rewrite `copilot-instructions.md` if it still describes the target repo as the toolkit.
2. Regenerate manifest keep entries for all files intentionally retained.
3. Delete copied bundle files that are out of scope, then rerun validation.
```

## Fix Guidance

| Issue | Fix |
|---|---|
| Generic package or module names | Replace with names from Phase 1 scan |
| `applyTo` matches 0 files | Update the pattern or remove the instruction from the keep set |
| Missing agent in `dev-orchestrator.agent.md` | Add the agent or delete the file if it should not remain |
| Leftover bootstrap template | Delete it and remove it from any cross references |
| Target repo misidentified as toolkit | Rewrite `copilot-instructions.md`, rerun classification, regenerate manifest keep set, and rerun cleanup |
| Manifest missing retained files | Update the manifest so the keep set matches the final tree |
