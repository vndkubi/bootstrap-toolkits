---
name: bootstrap-phase-scan
description: "Run Phase 1 of the bootstrap pipeline: Scan. Read root-level evidence from the target repo and produce stack, module, build, test, and identity findings before classification. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 1, scan, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 1 — Scan

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 1
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the scan step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- scan findings
- repo identity evidence

## Phase Contract

- Goal: Read root-level evidence from the target repo and produce stack, module, build, test, and identity findings before classification.
- Hand-off: continue with `bootstrap-phase-classify`.

## Verification Contract

- Expected Outcome: Phase 1 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 1 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
