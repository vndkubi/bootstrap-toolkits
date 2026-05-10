---
name: bootstrap-phase-cleanup-summary
description: "Run Phase 15 of the bootstrap pipeline: Manifest, Snapshot, Cleanup, and Summary. Write manifest and summary artifacts, delete bootstrap-only residue, and capture the retained surface honestly. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 15, manifest, snapshot, cleanup, and summary, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 15 — Manifest, Snapshot, Cleanup, and Summary

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 15
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the manifest, snapshot, cleanup, and summary step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Previous phase hand-off loaded from `.github/.bootstrap-state.json`

## Outputs

- manifest
- summary
- cleanup report
- phase summary
- next phase inputs bundle

## Phase Contract

- Goal: Write manifest and summary artifacts, delete bootstrap-only residue, and capture the retained surface honestly.
- Hand-off: none. This closes the bootstrap execution slice.

## Progressive Disclosure Contract

- Write or update this phase entry in `.github/.bootstrap-state.json` using `.github/schemas/bootstrap-phase-state.schema.json`.
- Required hand-off keys: `goal`, `summary`, `detailsPath`, `evidencePaths`, `decisions`, `assumptions`, `openQuestions`, and `nextPhaseInputs`.
- Default hand-off mode is **summary-first**: the next phase should load `summary` and `nextPhaseInputs` before opening `detailsPath`.
- Open `detailsPath` only when the summary is insufficient, stale, or contradicted by fresh repo evidence.

## Verification Contract

- Expected Outcome: Phase 15 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs, `.github/.bootstrap-state.json` entry, and state transition against the matching Phase 15 section in `.github/skills/generate-copilot-config/SKILL.md` and `.github/schemas/bootstrap-phase-state.schema.json`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
