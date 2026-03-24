---
name: specify-feature
description: "Spec-driven pipeline: create a feature workspace, specify requirements, plan implementation, generate tasks, then implement from approved artifacts."
agent: agent
---

# Specify Feature

You are the `@dev-orchestrator`. Run the full spec-driven pipeline for the feature below.

## Feature

**Description**: ${input:featureDescription}
**Target users / personas** (optional): ${input:targetUsers}
**Known constraints** (optional): ${input:constraints}

## Instructions

Run the full Spec -> Plan -> Tasks pipeline:

1. **Specify** - use `specify-feature` to create the feature workspace under `specs/`, write `spec.md`, and mark uncertainties with `[NEEDS CLARIFICATION]`.
2. **Plan** - once the spec is approved, use `plan-implementation` to create `plan.md` plus the supporting artifacts justified by the feature, including `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` where relevant.
3. **Tasks** - once the plan is approved, use `generate-tasks` to derive `tasks.md` from the full feature workspace, not just the plan.
4. **Implement** - execute the approved tasks in order, verifying at each checkpoint. Follow `implement-feature` so implementation stays aligned with the spec and plan artifacts, using the repo's actual stack and commands.

## Rules

- Do not skip the specify step, even for a small feature.
- Mark uncertainties with `[NEEDS CLARIFICATION]` instead of guessing.
- Stop at each stage and wait for approval before proceeding.
- All implementation must pass Phase -1 Gates from `constitution.md`.
