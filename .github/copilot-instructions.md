# Copilot Bootstrap Toolkit

This repository is the bootstrap toolkit itself. Most files under `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.github/prompts/`, and `.github/templates/` are template or generation assets for downstream projects, not project-specific outputs for this repository.

## Read This Repository In Layers

- `.github/README.md`: portable bundle overview for copy-and-bootstrap usage.
- `.github/prompts/bootstrap-copilot.prompt.md`: main entry point after the bundle is copied.
- `.github/skills/generate-copilot-config/SKILL.md`: canonical bootstrap pipeline and validation source of truth.
- `.github/agents/conductor.agent.md`: orchestration behavior for bootstrap and multi-step delegation.
- `.github/docs/runtime-overview.md`: request, prompt, and tool-loop mental model.
- `.github/docs/tool-runtime.md`: tool exposure, round-trips, and hook-aligned automation guidance.
- `.github/docs/prompt-and-context.md`: context layering, prompt-shape, and signal-vs-noise rules.
- `.github/docs/github-resource-conventions.md`: which `.github/` files are prompt resources versus governance or generated output.
- `.github/docs/user-playbook.md`: practical user guidance for prompts, threads, and verification.
- `.github/docs/team-operating-model.md`: how to convert repeated prompt pain into durable repo memory.
- `.github/constitution.md`: immutable governance referenced by agents, skills, prompts, and templates.
- `README.md`: broader product overview in the source repository.

## Working Rules For This Repo

- Optimize for maintaining the toolkit, not for treating generated template files as if they were already tailored to this repository.
- Keep the portable bootstrap bundle self-contained inside `.github/` so users can copy this folder alone into a target repository and run `/bootstrap-copilot`.
- Keep the system aligned across surfaces. If a pipeline step, naming rule, validation rule, supported stack, or generated artifact changes, update the relevant skill, agents, prompts, README, and docs together.
- Prefer repo-specific operational guidance over brochure-style text. Copilot works better when instructions explain how to maintain this toolkit.
- Treat missing generated-project artifacts as expected unless the task is explicitly about generation outputs. In this repository, the absence of `.github/hooks/`, `.github/domains/`, `.github/.bootstrap-manifest.json`, `.github/.bootstrap-state.json`, `.github/module-dependency-map.json`, and `.github/MODULE-ARCHITECTURE.md` is normal.
- Most language `.instructions.md` files are template outputs. They usually do not describe this repository's own implementation conventions.

## Sync Expectations

- Pipeline logic lives primarily in `.github/skills/generate-copilot-config/SKILL.md`. Do not redefine the same workflow differently in prompts or agents.
- If you rename an agent or skill, keep file names, frontmatter names, directory names, README references, prompt references, and orchestrator `agents:` lists in sync.
- If you change a spec-driven flow, review the related agents, prompts, templates, and skills as one unit.
- When auditing `.github/`, distinguish between template inventory, source-of-truth files, and generated runtime artifacts.

## Preferred Verification

- Check frontmatter completeness and cross-reference consistency.
- Check that skill `name` matches the skill directory.
- Check that prompts stay lightweight entry points and skills keep the detailed workflow.
- Check that repo docs and `.github/` guidance describe the same behavior.
- Check that `.github/docs/` still explains runtime flow, context strategy, `.github` conventions, and practical prompting.
- Check that `.github/docs/` still covers tool runtime and team operating model guidance.
