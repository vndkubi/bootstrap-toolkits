---
name: bootstrap-phase-skills
description: "Run Phase 9 of the bootstrap pipeline: Generate Skills. Generate runtime skills that map the retained workflows, validations, and repo-specialized capabilities. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 9, generate skills, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 9 — Generate Skills

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 9
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the generate skills step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- runtime skills

## Phase Contract

- Goal: Generate runtime skills that map the retained workflows, validations, and repo-specialized capabilities.
- Hand-off: continue with `bootstrap-phase-prompts`.

## Verification Contract

- Expected Outcome: Phase 9 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 9 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
