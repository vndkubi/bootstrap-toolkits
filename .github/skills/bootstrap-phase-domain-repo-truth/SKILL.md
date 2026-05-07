---
name: bootstrap-phase-domain-repo-truth
description: "Run Phase 3 of the bootstrap pipeline: Domain and Repo Truth Pack. Build the progressive-disclosure truth pack that anchors global, module, and workflow reasoning for the target repo. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 3, domain and repo truth pack, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 3 — Domain and Repo Truth Pack

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 3
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the domain and repo truth pack step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- repo truth pack
- domain map

## Phase Contract

- Goal: Build the progressive-disclosure truth pack that anchors global, module, and workflow reasoning for the target repo.
- Hand-off: continue with `bootstrap-phase-core-instructions`.

## Verification Contract

- Expected Outcome: Phase 3 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 3 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
