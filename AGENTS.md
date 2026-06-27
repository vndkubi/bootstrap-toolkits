# Agents

## Purpose

This repository is the source for a portable AI bootstrap bundle. The main shipped artifact is `.github/`; target repositories copy that folder, run `/bootstrap-copilot`, and let the pipeline rewrite and prune the copied templates into repo-specific AI guidance.

## Source Of Truth

- Start with `README.md` for project intent and operator flow.
- Use `.github/skills/generate-copilot-config/SKILL.md` as the canonical bootstrap pipeline.
- Use `.github/docs/prompt-and-context.md` and `.github/docs/repo-intelligence-router.md` for context-budget rules.
- Use `.github/scripts/repo-index.js` before broad scans when mapping a target repo.
- Treat `Prompt_Engineering.md`, `.artifacts/`, `.copilot/`, and local run outputs as reference or evidence only, not default context.

## Working Rules

- Prefer bounded evidence over whole-repo scans.
- For exact fixes, use the smallest relevant file slice and targeted tests.
- For ambiguous, broad, or high-risk work, route through specification, plan, and context-packet flows.
- Do not assume Copilot, Codex, Claude, Cursor, and MCP hosts load the same files.
- Keep provider-neutral guidance compact; put provider-specific behavior in that provider's adapter file.

## Verification

- Run focused Node tests for changed contracts, for example `node tests/test-repo-index.js`.
- Before claiming bootstrap behavior is complete, run all visible `tests/test-*.js` files.
- After adding or changing any agent, skill, instruction, or prompt, regenerate catalogs so docs cannot drift: `node .github/scripts/sync-skill-metadata.js` then `node scripts/sync-readme-catalog.js`. CI guards are `tests/test-skill-catalog.js`, `tests/test-readme-catalog.js`, and `tests/test-no-orphan-skills.js`.
- Use `node scripts/audit-refs.js` to report skills with no inbound routing references before adding a new skill.
