---
name: bootstrap-phase-prompts
description: "Run Phase 10 of the bootstrap pipeline: Generate Prompts. Generate the user-facing prompt surface that exposes the retained workflow entry points without bootstrap residue. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 10, generate prompts, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 10 — Generate Prompts

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 10
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the generate prompts step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- prompts

## Phase Contract

- Goal: Generate the user-facing prompt surface that exposes the retained workflow entry points without bootstrap residue.
- Hand-off: continue with `bootstrap-phase-hooks-workflows`.

## Verification Contract

- Expected Outcome: Phase 10 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 10 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
