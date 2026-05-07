---
name: bootstrap-phase-classify
description: "Run Phase 2 of the bootstrap pipeline: Classify. Translate scan evidence into repo size, complexity, and retained-surface strategy before generation starts. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 2, classify, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 2 — Classify

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 2
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the classify step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- classification summary
- tier recommendation

## Phase Contract

- Goal: Translate scan evidence into repo size, complexity, and retained-surface strategy before generation starts.
- Hand-off: continue with `bootstrap-phase-domain-repo-truth`.

## Verification Contract

- Expected Outcome: Phase 2 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 2 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
