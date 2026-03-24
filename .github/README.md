# Copilot Bootstrap Bundle

This `.github/` folder is designed to be copied into another repository and used directly with `/bootstrap-copilot`.

If this bundle has been copied into a target repo, do not treat bundle wording by itself as proof that the target repo is the `copilot-bootstrap` source repository. Determine repo identity from the target repo's own files.

## Quick Start

1. Copy this `.github/` folder into the target repository.
2. Open the target repository in GitHub Copilot Chat.
3. Run `/bootstrap-copilot`.
4. Let the bootstrap pipeline analyze the target codebase, replace template content with project-specific output, and clean up copied toolkit files that are not needed afterward.

## Read This Bundle In Order

- `.github/prompts/bootstrap-copilot.prompt.md`: main entry point.
- `.github/skills/generate-copilot-config/SKILL.md`: canonical bootstrap pipeline and validation rules.
- `.github/agents/conductor.agent.md`: orchestration behavior and delegation.
- `.github/copilot-instructions.md`: global repo-level guidance for the copied bundle.
- `.github/constitution.md`: immutable governance and quality gates.
- `.github/docs/runtime-overview.md`: how requests, tools, and generated output flow through the bundle.
- `.github/docs/tool-runtime.md`: how tool exposure, hook automation, and tool-result round-trips work.
- `.github/docs/prompt-and-context.md`: context optimization rules for prompting and bundle design.
- `.github/docs/github-resource-conventions.md`: which `.github/` resources matter directly to Copilot.
- `.github/docs/user-playbook.md`: practical prompting and thread-management guidance.
- `.github/docs/team-operating-model.md`: how a team should evolve repo memory over time.

## Important Mental Model

Before bootstrap runs, this folder contains toolkit templates and bootstrap assets.

After bootstrap runs in the target repository, the generated `.github/` should become project-specific:

- `copilot-instructions.md`
- agents
- skills
- prompts
- instructions
- templates
- optional hooks, domains, workflows, manifests, dependency maps, and `docs/` repo-memory files

Files that remain generic or out of scope for the detected repo should be removed during cleanup instead of staying in the final bundle.

So if you inspect the copied bundle before generation:

- many files are still generic templates
- some generated outputs do not exist yet
- that is expected

## Source Of Truth Map

| Need | Primary file |
|---|---|
| Bootstrap pipeline phases and validation | `.github/skills/generate-copilot-config/SKILL.md` |
| Main bootstrap entry point | `.github/prompts/bootstrap-copilot.prompt.md` |
| Agent orchestration | `.github/agents/conductor.agent.md` |
| Global bundle guidance | `.github/copilot-instructions.md` |
| Governance and gates | `.github/constitution.md` |
| Runtime and context reference docs | `.github/docs/*.md` |

## Portable Bundle Rule

Anything required to use `/bootstrap-copilot` after copying this folder should live inside `.github/`.

Do not rely on bootstrap-repo-only docs outside `.github/` for core operation. External project files like the target repo `README.md`, build files, source code, and docs are still valid runtime inputs for analysis.

## Expected Missing Items Before Generation

These may not exist until the bootstrap pipeline generates them for the target repository:

- `.github/hooks/`
- `.github/domains/`
- `.github/.bootstrap-manifest.json`
- `.github/.bootstrap-state.json`
- `.github/.phase3-checkpoint.md`
- `.github/module-dependency-map.json`
- `.github/MODULE-ARCHITECTURE.md`

Their absence before generation is normal.

## Progressive Disclosure

Generated target repositories should not get the same doc volume by default.

- Small repos should usually get a short global layer: `copilot-instructions.md`, `docs/00-repo-overview.md`, `docs/03-verification-runbook.md`.
- Medium repos should add the common doc set: glossary, architecture map, engineering rules, and failure modes.
- Large and enterprise repos should then add `docs/modules/`, `docs/workflows/`, and `docs/decisions/` incrementally based on blast radius and business importance.

This keeps Copilot context layered as global truth, module truth, and task truth instead of forcing one giant knowledge dump.

It also means the generated repo should keep only the layers it actually needs. Anything outside the selected stack, repo size, or runtime keep set should be deleted in the cleanup phase.

## Practical Rule For Maintainers

If you change how bootstrap works, update the skill first, then sync the prompt, agents, instructions, templates, and any user-facing guidance that describes the same behavior.
