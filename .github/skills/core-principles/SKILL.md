---
name: core-principles
description: 'Core engineering principles that all agents follow: understand before changing, confirm business logic, no duplicate validation, multi-module awareness, clarify before acting, business domain awareness, and explain decisions. Reference this skill when you need detailed guidance on any of these principles.'
---

# Core Engineering Principles

These principles apply to ALL agents, skills, and workflows in this project. They are the foundation of high-quality, business-aware code generation.

## Principle 1: Understand Before Changing — Read the Current Code Flow First

**Every agent MUST thoroughly read and trace the existing code flow before making any change.** Never assume how the code works — always verify by reading the actual implementation.

- Trace the full call chain: Controller/Resource → Service → Repository → Database
- Understand what each layer is responsible for (validation, business logic, data access)
- Identify what is already handled at each layer before proposing changes
- In multi-module projects, map module boundaries and responsibilities

## Principle 2: Confirm Business Logic — Match Existing Business Rules

Before implementing or suggesting changes, confirm alignment with current business logic:

- If the codebase validates a field at the service layer, respect that pattern
- If business rules are enforced via database constraints, don't duplicate them in code
- When in doubt, present findings and ask the user to confirm the business intent

## Principle 3: No Duplicate Validation Across Layers

**Critical rule**: If validation is already handled at one layer, do NOT duplicate it at another unless there is a clear architectural reason.

| Layer | Validates |
|-------|----------|
| **REST/Controller** | Input format (`@NotNull`, `@Size`, `@Pattern`) |
| **Service** | Business rules (e.g., "order total ≤ credit limit") |
| **Repository/Database** | Data integrity (unique, FK, check constraints) |

Each layer validates what it owns. Do not re-validate upstream concerns downstream.

## Principle 4: Multi-Module Awareness

In multi-module projects (enterprise scale), understand module boundaries:

- Identify which module owns a given responsibility
- Do not duplicate logic that is already handled by another module
- Respect module APIs — don't bypass a module's public interface
- Flag cross-module duplication as a 🔴 Critical issue in reviews

## Principle 5: Clarify Before Acting — Ask the Right Questions First

**Ask clarifying questions when the request lacks sufficient detail.** Do not guess.

- Compose domain-specific questions and wait for answers before proceeding
- Batch related questions (max 3-5 at a time)
- Provide sensible defaults when possible: "I'll use PostgreSQL unless you prefer another?"
- Skip obvious questions — if the codebase already answers it, don't ask

**When to ask**: Ambiguous requests, multiple valid approaches, unclear business rules, breaking changes, infrastructure cost decisions.

**When NOT to ask**: Answer is in the codebase, obvious best practice, user already specified.

## Principle 6: Business Domain Awareness

**Understand the business domain before writing code.** Technically correct code that violates business rules is a critical failure.

- Read business rules from service classes, validators, and domain models
- Understand entity lifecycles and valid state transitions
- Respect domain terminology — use the same terms the codebase uses
- Map business workflows end-to-end before touching any part
- Reference business context in code comments, test names, and PR descriptions

## Principle 7: Explain Decisions & Report Outcomes

**Every agent MUST explain its decisions and provide a structured summary.**

### During Execution
- Before each major action, state what you're doing and why
- When choosing between alternatives, explain the trade-off
- When skipping something, explain why

### Post-Execution Summary
```markdown
## Summary of Changes

### What Was Done
| # | Action | File | Reason |
|---|--------|------|--------|

### Business Rules Implemented
- ✅ [rule 1]

### Design Decisions
| Decision | Alternatives Considered | Rationale |
|----------|------------------------|----------|

### What Was NOT Done (and why)
- [item] — [reason]
```
