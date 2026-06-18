# Apply Copilot Bootstrap Correctly

## Purpose

Give operators one concise path for applying this source bundle to real
repositories in GitHub Copilot Chat, while keeping generated repo-memory useful
for Codex, Claude Code, and other coding agents.

## Initial Setup For A Target Repository

1. Copy **only** the `.github/` folder from `copilot-bootstrap` into the root of the target repository.
2. Open the target repository in VS Code with GitHub Copilot Chat.
3. Run `/bootstrap-copilot`.
4. If slash prompts are unavailable, use `@conductor Analyze this codebase and generate a complete GitHub Copilot configuration`.
5. Review the generated output and keep the assets that match the detected stack, repo size, and workflow.

`/bootstrap-copilot` starts a fresh run by default. Existing `.github/.bootstrap-state.json`,
`.github/.bootstrap-manifest.json`, `.github/.bootstrap-summary.md`, or
`.github/.runtime-fidelity.json` files are stale evidence unless the user explicitly asks to resume.

## Template Guardrails

- Do not copy the whole `copilot-bootstrap` repository into a target project.
- Do not edit copied templates before bootstrap unless you are intentionally maintaining the source bundle.
- Treat copied `.github/` files as temporary bootstrap assets until the pipeline rewrites and prunes them.
- Determine target repo identity from the target repo's own `README.md`, build files, source code, tests, and docs.
- Do not let copied bundle wording make Copilot infer that the target repo is `copilot-bootstrap`.

## Daily Usage After Bootstrap

| Goal | Entry point |
|---|---|
| Implement a feature | `@dev-orchestrator Implement ...` |
| Investigate a PBI, bug, or feature | `@investigator Investigate ...` |
| Review normal changes | `/review-code` or `@code-reviewer Review ...` |
| Plan a high-risk review | `/plan-review-scope`, then `/review-code` |
| Promote recurring review lessons | `/promote-review-memory` or `/promote-learning` |
| Upgrade development behavior from review findings | `developmentLearning[]`, then `/promote-review-memory` after approval |

## Non-Copilot Agents

After bootstrap, shared agent orientation should live in compact provider-neutral files:

- `AGENTS.md` for Codex and generic coding agents
- `CLAUDE.md` as a thin Claude Code adapter, usually importing `@AGENTS.md`
- `docs/ai/00-repo-index.md` as the deterministic repo map for all agents

Keep these files short. Put detailed Copilot behavior in `.github/`, detailed workflows in skills, and large repo facts in generated docs or context packets.

## Code Review Lane

Code review should use the retained review lane instead of ad hoc comments:

- Load full changed files, callers, dependencies, and business anchors.
- Run functional review before technical review.
- Calibrate findings with `.github/skills/review-code-changes/references/codex-review-contract.md`.
- Report only introduced, actionable, concrete findings.
- Use `[P0]`-`[P3]` priority labels and short line ranges.
- Avoid style nits unless they obscure behavior or violate documented standards.

Primary review sources:

- `.github/docs/review-lane.md`
- `.github/docs/review-development-learning-loop.md`
- `.github/skills/review-code-changes/references/codex-review-contract.md`
- `.github/instructions/code-review.instructions.md`

## Development Learning Loop

Use the closed loop when review should prevent the same development mistake from recurring:

```text
development evidence -> review -> developmentLearning[] -> promotion report -> approved upgrade -> next development run
```

Rules:

- Review may propose `developmentLearning[]` candidates only after calibrated findings survive.
- Promotion candidates must be approval-gated and evidence-backed.
- Development upgrades should target the smallest owning surface: development skill, TDD loop, Java testing strategy, agent routing, or focused checklist.
- Do not silently edit durable rules directly from review output.

## Optional Repo Intelligence Stack

The generated bundle works without external tools. When `tokenopt` and `code-graph` are available, use this routing order for non-trivial work:

```text
task brief -> tokenopt scope/context budget -> code-graph boundary packet -> bootstrap skill -> targeted verification
```

Use direct bounded search/read instead when the task is small, exact, and already anchored. More tools only help when they reduce broad context and repair loops.

## Post-Bootstrap Validation

After bootstrap completes, verify:

- `.github/copilot-instructions.md` describes the target repository, not generic bundle identity.
- Agents, skills, instructions, and prompts retained in `.github/` match the detected stack and workflow.
- `.github/.bootstrap-summary.md` explains classification, retained assets, removed assets, and next action.
- `/review-code` still routes to the review lane when review support is retained.
- Review reports can emit approval-gated `developmentLearning[]` candidates when findings reveal reusable development gaps.
- Large repositories have repo-truth docs under `docs/` when the retained surface references them.

## Source Of Truth

- `.github/prompts/bootstrap-copilot.prompt.md`
- `.github/skills/generate-copilot-config/SKILL.md`
- `.github/README.md`
- `.github/docs/review-lane.md`
