---
name: bootstrap-phase-validate
description: "Run Phase 13 of the bootstrap pipeline: Validate. Validate structural, discoverability, dependency, and cleanup integrity before finalizing the generated output. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 13, validate, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 13 — Validate

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 13
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the validate step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- validation report

## Phase Contract

- Goal: Validate structural, discoverability, dependency, and cleanup integrity before finalizing the generated output.
- Hand-off: continue with `bootstrap-phase-devcontainer`.

## Verification Contract

- Expected Outcome: Phase 13 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 13 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
