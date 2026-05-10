---
name: bootstrap-phase-hooks-workflows
description: "Run Phase 11 of the bootstrap pipeline: Hooks and Optional Workflows. Generate hooks and optional workflow automation only when the target repo and capability tier justify them. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 11, hooks and optional workflows, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 11 — Hooks and Optional Workflows

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 11
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the hooks and optional workflows step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Previous phase hand-off loaded from `.github/.bootstrap-state.json`

## Outputs

- hooks
- optional workflows
- phase summary
- next phase inputs bundle

## Phase Contract

- Goal: Generate hooks and optional workflow automation only when the target repo and capability tier justify them.
- Hand-off: continue with `bootstrap-phase-runtime-compilation`.

## Progressive Disclosure Contract

- Write or update this phase entry in `.github/.bootstrap-state.json` using `.github/schemas/bootstrap-phase-state.schema.json`.
- Required hand-off keys: `goal`, `summary`, `detailsPath`, `evidencePaths`, `decisions`, `assumptions`, `openQuestions`, and `nextPhaseInputs`.
- Default hand-off mode is **summary-first**: the next phase should load `summary` and `nextPhaseInputs` before opening `detailsPath`.
- Open `detailsPath` only when the summary is insufficient, stale, or contradicted by fresh repo evidence.

## Verification Contract

- Expected Outcome: Phase 11 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs, `.github/.bootstrap-state.json` entry, and state transition against the matching Phase 11 section in `.github/skills/generate-copilot-config/SKILL.md` and `.github/schemas/bootstrap-phase-state.schema.json`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
