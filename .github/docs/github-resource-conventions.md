# `.github` Resource Conventions

## Purpose

Explain which `.github/` files matter directly to Copilot prompt assembly, which are bundle governance assets, and which are generated outputs or GitHub infrastructure.

## Source of Truth

- `.github/copilot-instructions.md`
- `.github/README.md`
- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/constitution.md`

## File Classification

### Group A — GitHub Infrastructure (NOT auto-injected into prompts)

Files consumed by GitHub or GitHub Actions, not by Copilot Chat prompt assembly:

- `.github/workflows/*`
- `.github/dependabot.yml`
- `.github/CODEOWNERS`
- `.github/ISSUE_TEMPLATE/*`
- `.github/commands.json`

These do **not** automatically become prompt context for Copilot Chat.

### Group B — Copilot Prompt Resources (directly affect prompt assembly)

Files the Copilot Chat extension resolves and may inject into prompts:

| File | How it enters the prompt |
|---|---|
| `.github/copilot-instructions.md` | Loaded as default repo-level instruction; injected via `CustomInstructionsService` |
| `.github/instructions/*.instructions.md` | Matched by `applyTo` glob in frontmatter; injected when file scope matches |
| `.github/agents/*.agent.md` | Registered as custom agents with persona, tool set, and instructions |
| `.github/prompts/*.prompt.md` | Reusable prompt files attachable in chat flows |
| `.github/skills/*/SKILL.md` | Skill entry points loaded when `chat.useAgentSkills` is enabled; nested files in the skill folder are also considered skill resources |

Key: the extension does not brute-force scan all `.instructions.md` files and match them manually. It relies on the platform's prompt-file/customization pipeline to resolve which files match.

### Group C — Governance and Supporting Docs (not auto-injected, but high value)

Files useful for humans, skills, and custom agents — but only loaded when explicitly requested:

- `.github/constitution.md` — immutable governance rules
- `.github/MODULE-ARCHITECTURE.md` — module dependency overview
- `.github/module-dependency-map.json` — machine-readable dependency graph
- `.github/docs/*.md` — runtime, context, convention, and playbook guidance

These are "pull" resources: a skill or agent explicitly reads them, or a user references them.

## Request / Data Flow

1. Prompt-relevant resources (Group B) are resolved by the platform customization pipeline during prompt assembly.
2. Governance and supporting docs (Group C) are consumed when skills, agents, or prompts explicitly reference them.
3. Generated outputs such as manifests, dependency maps, and domain registries may appear only after bootstrap runs in a target project.

## Key Constraints

- Do not treat all `.github/` files as equivalent prompt resources.
- Keep portable bundle guidance inside `.github/` so copied bundles are self-contained.
- Distinguish toolkit template assets from target-project generated output.
- Keep source-of-truth ownership clear: skills define workflows, prompts are thin entry points, agents define role/orchestration.
- Scoped instruction files (`.instructions.md`) use `applyTo` frontmatter globs; keep these narrow to avoid loading irrelevant instructions.

## Verification

- Confirm `SKILL.md` names match their directory names.
- Confirm prompts stay lightweight and defer to the right skill or agent.
- Confirm agent descriptions and routing references stay in sync.
- Confirm `.github/README.md` and `copilot-instructions.md` still describe the same portable-bundle model.
- Confirm the Group A / B / C classification is respected: infra files are not referenced as if they are prompt resources.

## Common Failure Modes

- Treating missing generated files as defects before bootstrap has run.
- Updating a prompt or README claim without updating the skill that owns the workflow.
- Letting prompt resources contradict each other about supported hooks, phases, or generated outputs.
- Confusing GitHub infra configuration with Copilot prompt configuration.
- Assuming every `.github/` file is automatically sent to the model (only Group B resources are resolved by the platform).

## Related Files

- `.github/docs/runtime-overview.md`
- `.github/docs/prompt-and-context.md`
- `.github/docs/user-playbook.md`
