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
- Outputs from the previous phase

## Outputs

- manifest
- summary
- cleanup report

## Phase Contract

- Goal: Write manifest and summary artifacts, delete bootstrap-only residue, and capture the retained surface honestly.
- Hand-off: none. This closes the bootstrap execution slice.

## Verification Contract

- Expected Outcome: Phase 15 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 15 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
