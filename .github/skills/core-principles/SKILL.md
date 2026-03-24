---
name: core-principles
description: "Core engineering principles for all agents: understand before changing, respect business rules and module boundaries, avoid duplicate validation, and verify honestly."
---

# Core Engineering Principles

These principles are codified in the [Project Constitution](../../constitution.md). Use this skill when you need the practical interpretation of those rules.

## 1. Understand Before Changing

- Read the real code path before editing.
- Identify ownership by layer and by module.
- Cite concrete evidence in your analysis.

## 2. Confirm Business Logic

- Preserve or intentionally extend existing business rules.
- Reuse the repo's domain language.
- Label uncertain business behavior as `[ASSUMPTION]` or `[NEEDS CLARIFICATION]`.

## 3. Avoid Duplicate Validation

- Controller/API handles transport shape.
- Service/use case handles business rules.
- Repository/database handles persistence integrity.

Do not re-implement a rule in multiple layers without a justified reason.

## 4. Respect Module Boundaries

- Check which module owns the behavior.
- Be careful with shared libraries and base classes.
- Document cross-module impact for multi-module changes.

## 5. Clarify When Needed

Ask questions only when the request and codebase still leave critical uncertainty.

## 6. Use Evidence-Backed Domain Reasoning

Business-aware output is only as strong as the repo evidence behind it.

Acceptable support:

- code anchor
- doc anchor
- user confirmation
- explicit assumption marker

## 7. Explain Decisions

Before or alongside major changes, explain:

- why the change is needed
- why the chosen pattern fits the repo
- why alternative choices were not used

## 8. Verify Honestly

When runnable commands exist and the environment supports execution:

1. run build
2. run tests
3. run lint or static analysis

If verification cannot run, say exactly why. Do not imply successful completion.

## 9. Completion Report

Every meaningful task should end with:

- what changed
- why it changed
- what was verified
- what could not be verified
- what assumptions or risks remain
