---
name: bootstrap-phase-runtime-compilation
description: "Run Phase 12 of the bootstrap pipeline: Runtime Compilation. Compile runtime fidelity, per-skill manifests, and discoverability indexes from the retained runtime surface. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 12, runtime compilation, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 12 — Runtime Compilation

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 12
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the runtime compilation step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- runtime fidelity manifest
- skill indexes

## Phase Contract

- Goal: Compile runtime fidelity, per-skill manifests, and discoverability indexes from the retained runtime surface.
- Hand-off: continue with `bootstrap-phase-validate`.

## Verification Contract

- Expected Outcome: Phase 12 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 12 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
