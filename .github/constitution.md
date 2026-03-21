# Project Constitution

> **Immutable principles governing all specification-to-code transformation in this project.**
> Every agent, skill, and workflow MUST comply with these Articles. Violations MUST be flagged, not silently ignored.

---

## Article I: Understand Before Changing

**Every agent MUST thoroughly read and trace the existing code flow before making any change.** Never assume how the code works — always verify by reading the actual implementation.

- Trace the full call chain from entry point to data store
- Understand what each layer is responsible for
- Identify what is already handled before proposing changes
- In multi-module projects, map module boundaries and responsibilities

**Enforcement**: Any implementation that does not reference specific file paths and line numbers from the as-is analysis is non-compliant.

---

## Article II: Confirm Business Logic

**Proposed changes MUST align with existing business rules.** Technically correct code that violates business rules is a critical failure.

- Read business rules from service classes, validators, and domain models
- Understand entity lifecycles and valid state transitions
- Respect domain terminology — use the same terms the codebase uses
- When in doubt, present findings and ask the user to confirm

**Enforcement**: Every implementation must list which business rules it touches and how it preserves or extends them.

---

## Article III: No Duplicate Validation Across Layers

**Each layer validates ONLY what it owns.** If validation is already handled at one layer, do NOT duplicate it at another.

| Layer | Validates |
|-------|----------|
| **REST/Controller** | Input format (`@NotNull`, `@Size`, `@Pattern`, Data Annotations) |
| **Service** | Business rules (e.g., "order total ≤ credit limit") |
| **Repository/Database** | Data integrity (unique, FK, check constraints) |

**Enforcement**: Pre-implementation gate must document which layer handles which validation. Reviewers must flag any cross-layer duplication as 🔴 Critical.

---

## Article IV: Multi-Module Boundaries

**In multi-module projects, respect module boundaries absolutely.**

- Each module owns its responsibilities — do not duplicate logic across modules
- Never bypass a module's public interface
- Cross-module duplication is a 🔴 Critical issue
- New cross-module dependencies require explicit justification

**Enforcement**: Any change touching multiple modules must include a module impact matrix.

---

## Article V: Clarify Before Acting

**Ask clarifying questions when the request lacks sufficient detail. Do NOT guess.**

- Mark uncertain areas with `[NEEDS CLARIFICATION]` markers instead of assuming
- Batch related questions (max 3-5 at a time)
- Provide sensible defaults when possible
- Skip questions the codebase already answers

**Enforcement**: Specifications and investigation reports containing assumptions without `[NEEDS CLARIFICATION]` markers or explicit user confirmation are non-compliant.

---

## Article VI: Test-First Verification

**Every agent that writes code MUST verify it works before presenting results.** Writing code without running it is incomplete work.

1. **BUILD**: Run build command → if fails, fix (max 3 retries)
2. **TEST**: Run tests → if fails, fix (max 3 retries)
3. **LINT**: Run linter → if fails, fix

Only report completion after all 3 pass. If still failing after 3 retries: STOP, report the issue, ask user for guidance.

**Enforcement**: Completion reports without build/test/lint evidence are non-compliant.

---

## Article VII: Simplicity — No Over-Engineering

**Prefer the simplest solution that satisfies the requirement.** Do not build for hypothetical future needs.

- Do not add abstraction layers unless there are 3+ concrete consumers today
- Do not wrap framework features — use them directly
- Do not add feature flags or backwards-compatibility shims when you can just change the code
- Three similar lines of code is better than a premature abstraction

**Enforcement**: Simplicity Gate (see Phase -1 Gates below) must pass before implementation begins.

---

## Article VIII: Anti-Abstraction

**Use framework and library features directly.** Do not create wrappers, adapters, or helper utilities for one-time operations.

- Use framework's DI, ORM, routing, validation directly
- One model representation per entity boundary (Entity ↔ DTO, not Entity ↔ DomainModel ↔ DTO ↔ ViewModel)
- No "just in case" interfaces — add interfaces when you have 2+ implementations

**Enforcement**: Anti-Abstraction Gate (see Phase -1 Gates below) must confirm direct framework usage.

---

## Article IX: Explain Decisions & Report Outcomes

**Every agent MUST explain its decisions during execution AND produce a structured completion report.**

- Before each major action, state what you're doing and why
- When choosing between alternatives, explain the trade-off
- Completion report MUST list every file created/modified/deleted with business justification
- Investigation-only tasks must list analyzed files + findings

**Enforcement**: Any deliverable without a completion report is incomplete.

---

## Phase -1 Gates — Constitutional Compliance Checks

**Before ANY implementation begins, these gates MUST pass.** Gates are checked by the implementor agent or orchestrator.

### Gate 1: Simplicity Gate
- [ ] Solution uses the minimum number of new files/classes needed
- [ ] No premature abstractions (no interfaces with single implementation, no unnecessary factories)
- [ ] No future-proofing code ("might need later" is not a valid reason)
- [ ] Justified if adding more than 5 new files for a single feature

### Gate 2: Duplication Gate
- [ ] Checked existing codebase for similar functionality before creating new code
- [ ] No validation duplicated across layers (documented which layer handles what)
- [ ] No business logic duplicated across modules
- [ ] Existing utilities and base classes are reused where applicable

### Gate 3: Business Logic Gate
- [ ] Business rules identified and traced from existing code
- [ ] Proposed changes confirmed to align with (not contradict) existing business rules
- [ ] Entity lifecycle and valid state transitions documented
- [ ] Domain terminology matches existing codebase

### Gate 4: Impact Gate
- [ ] All affected modules/files identified
- [ ] API contract changes assessed for backward compatibility
- [ ] Database changes have migration + rollback plan
- [ ] Cross-module dependencies mapped

### Gate Failure Protocol
If any gate fails:
1. Document which gate failed and why
2. Propose remediation
3. Ask user for confirmation before proceeding with a justified exception
4. Log the exception in the completion report under "Constitutional Exceptions"

---

## Constitutional Amendment Process

These Articles are designed to be stable, but they can evolve:

1. **Propose**: Document the proposed change with rationale
2. **Impact**: Assess which agents, skills, and workflows are affected
3. **Review**: All affected agents must be updated to reflect the change
4. **Document**: Update this constitution and the changelog below

### Changelog

| Date | Article | Change | Rationale |
|------|---------|--------|-----------|
| 2026-03-21 | All | Initial constitution formalized from core-principles | Apply spec-driven development methodology |
