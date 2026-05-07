---
name: bootstrap-phase-templates
description: "Run Phase 7 of the bootstrap pipeline: Generate Templates. Generate repo-specific templates for PRDs, handoffs, and other repeated writing surfaces. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 7, generate templates, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 7 — Generate Templates

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 7
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the generate templates step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- templates

## Phase Contract

- Goal: Generate repo-specific templates for PRDs, handoffs, and other repeated writing surfaces.
- Hand-off: continue with `bootstrap-phase-agents`.

## Verification Contract

- Expected Outcome: Phase 7 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 7 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
