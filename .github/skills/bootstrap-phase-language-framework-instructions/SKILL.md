---
name: bootstrap-phase-language-framework-instructions
description: "Run Phase 6 of the bootstrap pipeline: Generate Language and Framework Instructions. Retain only the language and framework instructions justified by the detected stack and file layout. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 6, generate language and framework instructions, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 6 — Generate Language and Framework Instructions

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 6
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the generate language and framework instructions step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- language instructions
- framework instructions

## Phase Contract

- Goal: Retain only the language and framework instructions justified by the detected stack and file layout.
- Hand-off: continue with `bootstrap-phase-templates`.

## Verification Contract

- Expected Outcome: Phase 6 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 6 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
