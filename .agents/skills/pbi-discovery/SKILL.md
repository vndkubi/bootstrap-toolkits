---
name: pbi-discovery
description: Turn a Product Backlog Item, issue, or feature request into an evidence-backed delivery contract with actors, scenarios, acceptance criteria, unknowns, and quality gates. Use before planning or implementation when requirements are new, ambiguous, incomplete, or disputed. Do not use to implement the change.
---

# PBI Discovery

Produce a testable contract without inventing missing requirements.

Apply `.ai-team/protocols/model-neutral-execution.md`. Under `compatibility-strict`, execute only this skill, use the exact output contract, and stop when required evidence is missing.

## Workflow

1. Gather the PBI, linked requirements, relevant repository facts, and prior decisions. Cite the exact source for each material claim.
2. Restate the user or business problem independently of the proposed solution.
3. Identify actors, preconditions, happy paths, edge cases, failure paths, and explicitly out-of-scope behavior.
4. Write stable acceptance IDs (`AC-01`, `AC-02`, ...) in observable Given/When/Then form.
5. Separate `CONFIRMED`, `INFERRED`, and `UNKNOWN` statements. Never convert an unknown into an assumption silently.
6. Record decisions that require the Product Owner, dependencies, risks, and evidence still needed.
7. Define verification signals and the Definition of Done.

## Output Contract

Use `.ai-team/templates/delivery/pbi-delivery-contract.md`. When the change has material domain behavior, also create `.ai-team/templates/business/business-change-model.md`.

Return these sections:

- Problem and user value
- Evidence and sources
- Actors and business scenarios
- Acceptance criteria with IDs
- Scope and non-goals
- Unknowns and decisions needed
- Risks and dependencies
- Verification plan and Definition of Done

Stop before implementation. If the PBI cannot be made testable, mark it `NOT READY` and list the smallest questions or evidence needed to unblock it.
