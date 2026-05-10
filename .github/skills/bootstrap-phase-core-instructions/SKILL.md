---
name: bootstrap-phase-core-instructions
description: "Run Phase 4 of the bootstrap pipeline: Generate Core Instructions. Generate the small always-loaded instruction layer that teaches the target repo operating model and global guardrails. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 4, generate core instructions, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 4 — Generate Core Instructions

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 4
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the generate core instructions step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Previous phase hand-off loaded from `.github/.bootstrap-state.json`

## Outputs

- core instructions
- phase summary
- next phase inputs bundle

## Phase Contract

- Goal: Generate the small always-loaded instruction layer that teaches the target repo operating model and global guardrails.
- Hand-off: continue with `bootstrap-phase-domain-instructions`.

## Progressive Disclosure Contract

- Write or update this phase entry in `.github/.bootstrap-state.json` using `.github/schemas/bootstrap-phase-state.schema.json`.
- Required hand-off keys: `goal`, `summary`, `detailsPath`, `evidencePaths`, `decisions`, `assumptions`, `openQuestions`, and `nextPhaseInputs`.
- Default hand-off mode is **summary-first**: the next phase should load `summary` and `nextPhaseInputs` before opening `detailsPath`.
- Open `detailsPath` only when the summary is insufficient, stale, or contradicted by fresh repo evidence.

## Verification Contract

- Expected Outcome: Phase 4 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs, `.github/.bootstrap-state.json` entry, and state transition against the matching Phase 4 section in `.github/skills/generate-copilot-config/SKILL.md` and `.github/schemas/bootstrap-phase-state.schema.json`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
