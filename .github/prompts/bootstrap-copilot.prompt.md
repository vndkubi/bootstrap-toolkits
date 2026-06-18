---
agent: Conductor
description: "Analyze the current codebase and generate a project-specific GitHub Copilot configuration."
---

# Bootstrap GitHub Copilot Configuration

You are a Copilot configuration generator. Analyze the current codebase and generate a complete `.github/` configuration optimized for this project.

## Instructions

Use the `@conductor` agent and follow the `generate-copilot-config` skill. That skill is the single source of truth for the bootstrap pipeline.

## Bootstrap Flow Contract

- `/bootstrap-copilot` is the primary bootstrap entrypoint for a copied bundle inside a target repository.
- The bootstrap handoff is `/bootstrap-copilot` -> `@conductor` -> `generate-copilot-config`.
- `/bootstrap-copilot` starts a fresh bootstrap by default. Existing `.github/.bootstrap-state.json`, `.github/.bootstrap-manifest.json`, `.github/.bootstrap-summary.md`, `.github/.bootstrap-snapshot.json`, or `.github/.runtime-fidelity.json` files from a prior run are stale evidence unless the user explicitly asks to resume.
- Expected bootstrap outputs are a project-specific `.github/` tree, `.github/.bootstrap-state.json` progress updates, a deterministic repo index when tooling is available, a repo truth pack sized to the target repo, `.github/.bootstrap-summary.md` with classification, retained or removed assets, and next action, and cleanup to the manifest keep set.
- The bootstrap state must use summary-first phase hand-offs: each completed `bootstrap-phase-*` writes a structured entry that matches `.github/schemas/bootstrap-phase-state.schema.json`, and later phases should read `summary` plus `nextPhaseInputs` before opening full details.
- If the current repository or workflow also has separate audit or delivery artifacts, treat them as optional evidence inputs around the bootstrap flow. Do not assume they exist or depend on them for bootstrap execution.
- Starting a background agent is not completion. In non-interactive CLI or automation surfaces, either execute the phases in the current session or wait for delegated work to finish, then verify the on-disk files before reporting success.

Assume the copied `.github/` folder is the full bootstrap bundle. Prefer source-of-truth guidance inside `.github/`, then enrich it with evidence from the target repo's `README.md`, build files, source code, tests, and docs.
Do not infer that the current repo is the `copilot-bootstrap` source repo from copied bundle files alone.

When you need runtime or context guidance, use:
- `.github/docs/runtime-overview.md`
- `.github/docs/tool-runtime.md`
- `.github/docs/prompt-and-context.md`
- `.github/docs/github-resource-conventions.md`
- `.github/docs/user-playbook.md`
- `.github/docs/team-operating-model.md`

## Critical Rules

0. **Fresh-run guardrail**: do not skip phases because a copied or pre-existing `.bootstrap-*` file says a prior bootstrap completed. Recreate the state for the current run, preserve old files only as optional evidence, and overwrite generated outputs after fresh scan/classification.
1. **Phase 1 (Scan) is foundational**: run the deterministic repo index first when available, then read all relevant build files, sample enough real code, and detect actual runtime/tooling versions.
2. **Repo identity comes from target-repo evidence**: use root files, code, tests, and docs to decide what this repo is; copied bootstrap assets are not sufficient proof.
3. **Phase 2 (Classify) happens before generation**: project size and complexity determine generation strategy.
4. **Phase 3 (Domain) is evidence-driven**: do not claim business truth without code/doc anchors; otherwise label assumptions explicitly.
5. **Repo truth pack first**: generate the progressive-disclosure doc layers before broad orchestration claims. Always start with global truth, then add module/workflow truth only when repo size justifies it.
6. **Context budget matters**: keep generated files compact and purpose-built.
7. **Agent and skill separation**: agents define routing/responsibility; skills define workflow details.
8. **Dev Orchestrator wiring**: generated `dev-orchestrator` must list all generated agents for default routing.
9. **Phase 13 (Validate) is mandatory**: structural, functional, and context-budget checks must pass before completion.
10. **Phase 12 (Runtime Compilation) is mandatory**: compile runtime fidelity manifest and skill index after generation phases complete.
11. **Phase 15 (Cleanup) is mandatory**: after validation, remove copied toolkit files that are out of scope for this repo so the final `.github/` matches the manifest and repo classification.
12. **Phase hand-offs are summary-first**: later phases must prefer `summary` and `nextPhaseInputs` from `.github/.bootstrap-state.json` over re-reading the full prior artifact set unless evidence conflicts or the summary is insufficient.

## Post-Bootstrap Maintenance

After initial generation completes, use these skills to audit and maintain config quality:

- `context-assembly-simulator` — simulate per-agent context load and flag budget overflows
- `context-budget-check` — validate generated Copilot files against context budget targets
- `instruction-conflict-detector` — detect overlapping `.instructions.md` files with contradicting rules
- `tool-permission-auditor` — verify agent × tool access matches declared roles
- `repo-memory-promoter` — audit memory gaps, instruction bloat, and underdocumented subsystems
- `review-memory-promotion` — turn stable review or investigation findings into approval-ready repo-memory candidates, including create/update proposals for checklist packs learned from accepted human PR discussion
- `review-effectiveness` — review which agents, skills, instructions, and memory-promotion loops are actually helping after a sprint or two
- `correction-ledger` — aggregate recurring correction signals into approval-ready promotion candidates as part of the learning loop
- `context-inspector` — answer bounded runtime questions such as missing triggers, missing tools, likely context loading, and retained-surface explanations when retained by capability tier
- `skill-discoverability-audit` — audit skill descriptions for runtime discoverability quality and routing coverage
- `drift-detector` — detect configuration drift since last bootstrap; recommends patch, incremental, or full rebootstrap

Do not advertise bootstrap-only helpers such as `source-of-truth-map` or `common-doc-generator` as ongoing maintenance tools after cleanup unless the canonical bootstrap skill is updated to retain them.

Retain user-facing review prompts such as `/plan-review-scope` and `/promote-review-memory` whenever the generated repo keeps `@code-reviewer` and `review-memory-promotion`.
Retain `/promote-learning` whenever the generated repo keeps `correction-ledger`.
Retain `/inspect-context` whenever the generated repo keeps `context-inspector`.
Do not drop newly generated runtime skills or prompts just because they are newer than a short static list; classify them in `.github/.runtime-fidelity.json` and keep them in the manifest unless they are explicitly bootstrap-only.
