---
name: validate-bootstrap-output
description: "Validate the quality of a bootstrapped Copilot configuration beyond structural checks. Tests that generated agents, skills, instructions, and cleanup decisions actually match the target project rather than leaving generic bootstrap residue."
---

# Validate Bootstrap Output

This skill runs deep quality validation on a bootstrapped `.github/` configuration, beyond the structural Phase 13 checks. It catches the most common failure: generated files that look valid but still contain generic placeholder or bootstrap-bundle content instead of project-specific guidance.

## When to Use

- After running `/bootstrap-copilot` to verify output quality
- After running `upgrade-config` to verify new files are project-specific
- When agents or skills seem to give generic responses that do not match the project
- When cleanup may have retained copied toolkit files that should have been deleted

## Validation Checklist

### Tier 1: Structural

Re-run Phase 13 checks from `generate-copilot-config`:

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
- `.github/.bootstrap-summary.md` describes retained or removed assets that do not match the final manifest or runtime fidelity state
- `docs/06-copilot-onboarding.md` references prompts, agents, skills, or workflows that were removed during cleanup
- manifest, summary, or onboarding guidance disagree on the applied capability tier or whether it was explicit vs inferred

Project-specificity checks:

| File | What to Verify |
|---|---|
| `copilot-instructions.md` | Contains the actual project name, actual build commands, actual module names, and no toolkit-self identity mistake |
| `dev-orchestrator.agent.md` | `agents:` list matches all generated agents that remain after cleanup |
| Stack-specific implementor | References the actual stack, paths, and conventions from Phase 1 scan |
| `testing.instructions.md` | References the actual test framework detected |
| Domain instructions | `applyTo` patterns match real project paths |
| Skill files | Build, test, lint, and verification commands match the real project |
| `.github/.bootstrap-summary.md` | Retained and removed assets match final manifest/runtime fidelity state and explainability text is specific to the target repo |
| `docs/06-copilot-onboarding.md` | Start paths and escalation guidance reference only retained runtime assets, remain repo-specific, and explain tier-specific helpers only when retained |

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

### Tier 4: Runtime Fidelity

- [ ] `.github/.runtime-fidelity.json` exists and is valid JSON
- [ ] `.github/skills/INDEX.json` exists and is valid JSON
- [ ] Every retained artifact after cleanup has a `runtimeRole` entry in the manifest
- [ ] No artifact with `runtimeRole: bootstrap_only` survives cleanup
- [ ] `.github/.bootstrap-manifest.json` records `capabilityTier`, `tierSelectionMode`, and `tierReason`
- [ ] Retained validation/debug helpers match the applied capability tier
- [ ] Token cost estimates use the `ceil(char_count / 4)` heuristic consistently
- [ ] `consumers` field is populated for all `auto_injected` and `discoverable` artifacts
- [ ] Every retained skill has `.github/skills/<name>/skill.json`
- [ ] `.github/.skill-index.json` exists and includes all retained skills
- [ ] All skills in `.skill-index.json` have an `invocationMode` classification
- [ ] Tier-filtered retained skills still satisfy all `requires.skills` dependencies
- [ ] Any `mcp_tools_used` entry is also declared through `requires.mcp`
- [ ] No retained skill declares required MCP dependencies unless the retained bundle also ships the matching MCP runtime/configuration surface
- [ ] `relations` capture cross-references between generated files (no orphan references)
- [ ] `auto_injected` artifacts total stays within context budget targets from `context-budget-check`

### Tier 5: Evidence-Based Documentation

For all generated documentation files, verify:

- [ ] Each doc has a `Source of Truth` section identifying the canonical code or config file
- [ ] Claims about the codebase are traceable to specific files, directories, or scan results
- [ ] No doc asserts business rules that were not found in code, tests, or existing docs
- [ ] Sections marked `[NEEDS CONTENT]` are used when evidence is insufficient, not fabricated claims
- [ ] Domain glossary terms map to actual entities in the codebase
- [ ] Architecture claims match actual module structure from Phase 1 scan

### Tier 6: Manifest And Cleanup Integrity

- [ ] `.github/.bootstrap-manifest.json` exists and is valid JSON
- [ ] Manifest keep entries match all files intentionally retained after cleanup
- [ ] Explicit tier choices are preserved honestly on upgrade, and inferred tier changes have a recorded reason
- [ ] Files outside the manifest keep set were deleted
- [ ] `.github/scripts/validate-manifest-fidelity.js` passes against the final workspace
- [ ] If the reviewed artifact is `.github`-only, any retained external `docs/` outputs are included alongside it or the artifact is explicitly marked partial
- [ ] `contextBudget.passed` is `true`
- [ ] The full copied toolkit inventory was not retained unless non-bundle evidence proves the repo truly is the toolkit source repository

Run `.github/scripts/validate-manifest-fidelity.js --json` during this tier and treat any reported issue as a real cleanup defect, not a documentation mismatch. The validator is responsible for proving three facts from disk state: manifest `removed.*` entries are actually gone, manifest keep entries actually exist, and runtime-loaded Copilot surfaces do not still reference removed skills, agents, prompts, or instructions by name.

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

### Tier 4: Runtime Fidelity
| Check | Status | Notes |
|---|---|---|
| .runtime-fidelity.json exists | PASS | |
| .github/skills/INDEX.json exists | PASS | |
| All retained artifacts have runtimeRole | PASS | |
| No bootstrap_only survived cleanup | PASS | |
| .skill-index.json exists | PASS | |
| Token budget within limits | WARN | auto_injected total 42 KB exceeds 40 KB target |

### Tier 5: Evidence-Based Documentation
| Check | Status | Notes |
|---|---|---|
| Source of Truth sections present | PASS | All 5 docs have SoT |
| Claims traceable | WARN | 1 architecture claim not anchored to scan |
| No fabricated business rules | PASS | |
| [NEEDS CONTENT] used appropriately | PASS | 2 sections correctly deferred |

### Tier 6: Manifest And Cleanup
| Check | Status | Notes |
|---|---|---|
| Manifest exists | PASS | |
| Keep set complete | WARN | 2 files retained but missing from manifest |
| Toolkit residue removed | FAIL | 14 copied toolkit files remain without justification |
| Manifest fidelity validator | FAIL | `removed.skills` lists `common-doc-generator` but `.github/skills/common-doc-generator/` still exists |

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
| Explainability summary contradicts retained output | Rebuild `.github/.bootstrap-summary.md` from the final manifest and runtime fidelity state |
| Onboarding doc references removed runtime assets | Regenerate `docs/06-copilot-onboarding.md` from the final retained prompts, agents, skills, and workflows only |
| Capability tier mismatch across manifest and docs | Recompute the retained surface from the chosen tier, then rebuild summary and onboarding from that final state |
| `.github` review snapshot omits retained external docs | Either copy the retained `docs/` files into the review artifact or mark the artifact as partial and remove misleading summary claims |
