# Copilot Bootstrap Bundle

This `.github/` folder is designed to be copied into another repository and used directly with `/bootstrap-copilot`.

If this bundle has been copied into a target repo, do not treat bundle wording by itself as proof that the target repo is the `copilot-bootstrap` source repository. Determine repo identity from the target repo's own files.

## Quick Start

1. Copy only this `.github/` folder into the target repository.
2. Open the target repository in GitHub Copilot Chat.
3. Run `/bootstrap-copilot`.
4. Let the bootstrap pipeline analyze the target codebase, replace template content with project-specific output, and clean up copied toolkit files that are not needed afterward.

For the full operator guide, read `.github/docs/apply-copilot-bootstrap.md`.

`/bootstrap-copilot` starts a fresh run by default. If the target repo already has `.github/.bootstrap-state.json`, `.github/.bootstrap-manifest.json`, `.github/.bootstrap-summary.md`, or `.github/.runtime-fidelity.json` from an older run, treat those as stale evidence unless you explicitly invoke a resume workflow.

If slash prompts are not available in your current chat surface, use the equivalent direct request:

```
@conductor Analyze this codebase and generate a complete GitHub Copilot configuration
```

## When To Copy This Bundle

Copy this `.github/` folder into a repository when you want bootstrap to generate a project-specific Copilot setup from the actual codebase.

- New or early-stage repositories that need a starting Copilot operating model
- Existing repositories that have no structured Copilot instructions, agents, prompts, or skills yet
- Multi-stack or multi-module repositories that need scoped instructions and routing
- Team-wide standardization where multiple repositories should start from the same bootstrap process

## How To Apply It Safely

1. Copy only the `.github/` bundle into the target repository without editing it first.
2. Treat the copied files as temporary bootstrap assets until `/bootstrap-copilot` rewrites them.
3. Let the target repository itself define identity. Root `README.md`, build files, source code, tests, and docs outweigh copied bundle wording.
4. Review the generated output after bootstrap and keep only the assets that match the detected stack, repo size, and workflow needs.
5. Expect some generated outputs to appear outside `.github/`, such as repo-truth docs in `docs/`, when the target repository is large enough to justify them.

## Read This Bundle In Order

- `.github/prompts/bootstrap-copilot.prompt.md`: main entry point.
- `.github/skills/generate-copilot-config/SKILL.md`: canonical bootstrap pipeline and validation rules.
- `.github/docs/apply-copilot-bootstrap.md`: practical copy, bootstrap, daily usage, review, and validation guide.
- `.github/agents/conductor.agent.md`: orchestration behavior and delegation.
- `.github/copilot-instructions.md`: global repo-level guidance for the copied bundle.
- `.github/constitution.md`: immutable governance and quality gates.
- `.github/docs/runtime-overview.md`: how requests, tools, and generated output flow through the bundle.
- `.github/docs/tool-runtime.md`: how tool exposure, hook automation, and tool-result round-trips work.
- `.github/docs/prompt-and-context.md`: context optimization rules for prompting and bundle design.
- `.github/docs/repo-intelligence-router.md`: large-repo context packet and MCP toolset strategy.
- `.github/docs/goal-tdd-engineer-loop.md`: `/goal`-driven TDD loop with trace, eval, feedback, and handoff artifacts.
- `.github/docs/java-test-architecture.md`: Java API component testing standard, Real Core/Mock Boundaries, and direct domain unit-test split.
- `.github/docs/review-playbook.md`: review planning, blast-radius thinking, and the canonical Review Scope Plan template.
- `.github/skills/review-code-changes/references/codex-review-contract.md`: actionable P0-P3 review finding calibration.
- `.github/docs/review-development-learning-loop.md`: how review findings become approval-gated development upgrades.
- `.github/docs/github-resource-conventions.md`: which `.github/` resources matter directly to Copilot.
- `.github/docs/user-playbook.md`: practical prompting and thread-management guidance.
- `.github/docs/team-operating-model.md`: how a team should evolve repo memory over time.

## Closed-Loop Runtime

After bootstrap, the generated project should keep improving from real evidence:

```text
bounded context -> development evidence -> review-report.json -> developmentLearning[] -> approved promotion -> next development run
```

Use `/review-code` for calibrated findings. When a surviving finding exposes a reusable development gap, the review output may include `developmentLearning[]`. Use `/promote-review-memory` to turn approved candidates into development-skill, testing, routing, or checklist updates. Review output alone must not silently edit durable rules.

## Optional TokenOpt And CodeGraph Layer

This bundle can run without external repo-intelligence tools. If the target environment later installs `tokenopt` and `code-graph`, use them as optional context providers:

| Tool | Use it for | Rule |
|---|---|---|
| `tokenopt` | scope lock, token budget, anchor choice, adaptive bypass | Call before broad scans; bypass on exact small tasks |
| `code-graph` | dependency, caller, route, symbol, and related-test boundaries | Start from `codegraph_context`; use lower-level graph tools only as follow-ups |
| bootstrap skills | implementation, review, testing, promotion, and provider-neutral workflow | Consume the bounded evidence packet instead of re-scanning the repo |

Adding tools does not reduce token use by itself. Cost drops only when the tools return small, typed, confidence-scored packets and the agent avoids redundant broad search.

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
| Apply the bundle in a target repo | `.github/docs/apply-copilot-bootstrap.md` |
| Main bootstrap entry point | `.github/prompts/bootstrap-copilot.prompt.md` |
| Agent orchestration | `.github/agents/conductor.agent.md` |
| Global bundle guidance | `.github/copilot-instructions.md` |
| Governance and gates | `.github/constitution.md` |
| Runtime and context reference docs | `.github/docs/*.md` |
| Review planning and scope template | `.github/docs/review-playbook.md` |
| Review finding calibration | `.github/skills/review-code-changes/references/codex-review-contract.md` |

## Portable Bundle Rule

Anything required to use `/bootstrap-copilot` after copying this folder should live inside `.github/`.

Do not rely on bootstrap-repo-only docs outside `.github/` for core operation. External project files like the target repo `README.md`, build files, source code, and docs are still valid runtime inputs for analysis.

## Expected Missing Items Before Generation

These may not exist until the bootstrap pipeline generates them for the target repository:

- `.github/hooks/`
- `.github/domains/`
- `.github/.bootstrap-manifest.json`
- `.github/.bootstrap-summary.md`
- `.github/.bootstrap-state.json`
- `.github/.phase3-checkpoint.md`
- `.github/module-dependency-map.json`
- `.github/MODULE-ARCHITECTURE.md`
- `docs/00-repo-overview.md`
- `docs/06-copilot-onboarding.md`
- `docs/02-architecture-map.md`

Their absence before generation is normal.

## Progressive Disclosure

Generated target repositories should not get the same doc volume by default.

- Small repos should usually get a short global layer: `copilot-instructions.md`, `docs/00-repo-overview.md`, `docs/03-verification-runbook.md`.
- Medium repos should add the common doc set: glossary, architecture map, engineering rules, and failure modes.
- Large and enterprise repos should then add `docs/modules/`, `docs/workflows/`, and `docs/decisions/` incrementally based on blast radius and business importance.

This keeps Copilot context layered as global truth, module truth, and task truth instead of forcing one giant knowledge dump.

For very large repositories, use the repo intelligence router model: start from deterministic repo index output, route each request to a domain, return line-ranged context packets, and expose only the toolsets needed for the task.

It also means the generated repo should keep only the layers it actually needs. Anything outside the selected stack, repo size, or runtime keep set should be deleted in the cleanup phase.

Use capability tiers separately from repo-size classification:

- `Lean` keeps the smallest useful day-to-day workflow surface
- `Collaborative` keeps planning, review, onboarding, and bounded diagnostics
- `Governed` keeps the full audit, validation, and debug helper layer

When generated, `.github/.bootstrap-summary.md` gives maintainers a concise explanation of classification, retained assets, removed assets, and the reasons behind the final surface. `docs/06-copilot-onboarding.md` gives maintainers a repo-specific starting guide when the retained runtime surface is rich enough to justify it.

If you capture only the generated `.github/` folder for review, treat that as a partial artifact. Either copy the retained repo-truth docs under `docs/` as well, or clearly mark the capture as `.github`-only so missing external docs are not mistaken for bootstrap failures.

Generated runtime metadata should also include a skill-manifest layer:

- `.github/skills/<name>/skill.json` for per-skill machine-readable metadata
- `.github/skills/INDEX.json` for the aggregated skill catalog used by progressive disclosure and tier-aware pruning
- `.github/.skill-index.json` for discoverability-only runtime metadata consumed by routing and diagnostics

## Practical Rule For Maintainers

If you change how bootstrap works, update the skill first, then sync the prompt, agents, instructions, templates, and any user-facing guidance that describes the same behavior.
