---
name: bootstrap-phase-agents
description: "Run Phase 8 of the bootstrap pipeline: Generate Agents. Generate agents and routing files that reflect the target repo stack, workflow, and escalation paths. Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase 8, generate agents, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase 8 — Generate Agents

This phase skill is the phase-local companion to `generate-copilot-config`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming `/bootstrap-copilot` at Phase 8
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the generate agents step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- agents
- routing updates

## Phase Contract

- Goal: Generate agents and routing files that reflect the target repo stack, workflow, and escalation paths.
- Hand-off: continue with `bootstrap-phase-skills`.

## Verification Contract

- Expected Outcome: Phase 8 completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase 8 section in `.github/skills/generate-copilot-config/SKILL.md`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
