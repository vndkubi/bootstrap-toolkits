---
name: bootstrap-phase-domain-instructions
description: "Run Phase 5 of the bootstrap pipeline: Generate Domain Instructions. Generate domain-scoped instruction files that keep business or subsystem context narrow and searchable. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 5, generate domain instructions, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 5 — Generate Domain Instructions

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 5
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the generate domain instructions step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- domain instructions

## Phase Contract

- Goal: Generate domain-scoped instruction files that keep business or subsystem context narrow and searchable.
- Hand-off: continue with `bootstrap-phase-language-framework-instructions`.

## Verification Contract

- Expected Outcome: Phase 5 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 5 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
