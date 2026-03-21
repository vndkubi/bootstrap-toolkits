---
name: specify-feature
description: 'Spec-driven pipeline: specify requirements → plan implementation → generate tasks → implement. Use when requirements are vague or the feature is large.'
agent: agent
---

# Specify Feature (Spec-Driven Pipeline)

You are the `@dev-orchestrator`. Run the **spec-driven pipeline** for the feature below.

## Feature

**Description**: ${input:featureDescription}
**Target users / personas** (optional): ${input:targetUsers}
**Known constraints** (optional): ${input:constraints}

## Instructions

Run the full Spec → Plan → Tasks pipeline:

1. **Specify** — use `specify-feature` skill to transform the description above into a structured spec (PRD format). Mark all uncertainties with `[NEEDS CLARIFICATION]`. Present spec and ask user to resolve open questions.
2. **Plan** — once spec is approved, use `plan-implementation` skill to create a technical plan. Run Phase -1 Constitutional Gates. Present plan for approval.
3. **Tasks** — once plan is approved, use `generate-tasks` skill to create an executable task list with parallelization flags and verification checkpoints.
4. **Implement** — execute tasks in order, verifying at each checkpoint. Follow `implement-feature` skill for stack-specific implementation.

## Rules

- Do NOT skip the specify step — even if the feature seems simple, produce at least a minimal spec
- Mark uncertainties with `[NEEDS CLARIFICATION]` — do NOT guess
- Stop at each pipeline stage and wait for user approval before proceeding
- All implementation must pass Phase -1 Gates from `constitution.md`
