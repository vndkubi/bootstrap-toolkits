# Project Constitution

> Immutable principles governing all specification-to-code transformation in this project.
> Every agent, skill, and workflow must comply with these articles.

---

## Article I: Understand Before Changing

Every agent must read and trace the existing code flow before changing it.

- Trace the real call chain from entry point to data store or external dependency.
- Understand what each layer and module already owns.
- Reference concrete files and lines in analysis or implementation notes.

Enforcement: implementations that cannot point to actual as-is evidence are non-compliant.

---

## Article II: Confirm Business Logic

Proposed changes must align with existing business rules.

- Read business rules from service code, validators, state machines, data constraints, and docs.
- Reuse the repo's actual domain terms.
- If business intent is inferred rather than proven, label it `[ASSUMPTION]` or `[NEEDS CLARIFICATION]`.

Enforcement: every implementation must explain which business rules it preserves, extends, or leaves uncertain.

---

## Article III: No Duplicate Validation Across Layers

Each layer validates only what it owns.

| Layer | Owns |
|---|---|
| Controller / API | input shape, transport concerns |
| Service / Use case | business rules and orchestration |
| Repository / Database | persistence integrity and constraints |

Enforcement: pre-implementation notes must document validation ownership. Cross-layer duplication is a critical finding.

---

## Article IV: Respect Module Boundaries

In multi-module systems, do not duplicate logic across module boundaries or bypass a module's public interface.

- Identify module ownership before changing shared code.
- Document cross-module impact for any multi-module change.
- Treat high-dependency modules as high-risk surfaces.

Enforcement: multi-module changes require an impact matrix.

---

## Article V: Clarify Before Acting

Ask clarifying questions when the request is underspecified.

- Do not guess hidden business rules or compatibility constraints.
- Batch related questions.
- Skip questions the codebase already answers.

Enforcement: unresolved assumptions must be labeled explicitly.

---

## Article VI: Verify Before Claiming Completion

Every agent that writes code must verify it before claiming completion when runnable commands exist and the environment supports execution.

1. **Build**: run the project's build command when it exists and is runnable.
2. **Test**: run the project's tests when they exist and are runnable.
3. **Lint**: run the project's lint or static-analysis command when it exists and is runnable.

If verification fails, fix and retry up to 3 times per step.

If commands are missing, require unavailable infrastructure, or cannot run in the current environment, say that explicitly in the completion report.

Enforcement: completion reports without verification evidence, or without an explicit explanation for missing verification, are non-compliant.

---

## Article VII: Prefer Simplicity

Prefer the simplest solution that satisfies the requirement.

- Avoid abstractions without multiple real consumers.
- Do not add future-proofing code by default.
- Favor small, obvious changes over speculative architecture.

Enforcement: the Simplicity Gate must pass before implementation.

---

## Article VIII: Avoid Unnecessary Abstraction

Use framework and library features directly unless there is a real, present need for indirection.

- Do not wrap one-off framework features.
- Do not create interfaces for single implementations without a real seam.
- Keep representations minimal across boundaries.

Enforcement: deviations require explicit justification.

---

## Article IX: Explain Decisions and Report Outcomes

Every agent must explain meaningful decisions and provide a completion report.

- State what you are doing and why before major actions.
- Explain trade-offs when choosing between alternatives.
- Report files changed, business reasoning, verification results, and open risks.

Enforcement: deliverables without a completion report are incomplete.

---

## Phase -1 Gates

These gates must pass before implementation begins.

### Gate 1: Simplicity
- [ ] Minimum necessary files/classes
- [ ] No speculative abstractions
- [ ] No "might need later" code

### Gate 2: Duplication
- [ ] Existing similar logic checked first
- [ ] No duplicate validation across layers
- [ ] No duplicated business logic across modules

### Gate 3: Business Logic
- [ ] Existing rules traced from code or docs
- [ ] Proposed changes align with discovered rules
- [ ] Unknowns labeled explicitly

### Gate 4: Impact
- [ ] Affected files/modules identified
- [ ] API compatibility checked
- [ ] Database changes include migration and rollback thinking
- [ ] Verification approach identified

### Gate Failure Protocol

If any gate fails:

1. Document the failed gate and why.
2. Propose remediation.
3. Ask for confirmation before proceeding with an exception.
4. Log the exception in the completion report.

---

## Amendment Process

1. Propose the change and rationale.
2. Assess which agents, skills, prompts, or docs are affected.
3. Update all affected files together.
4. Record the change in the changelog.

## Changelog

| Date | Article | Change | Rationale |
|---|---|---|---|
| 2026-03-21 | All | Initial constitution formalized | Apply spec-driven engineering principles |
| 2026-03-24 | II, VI | Added evidence/assumption guardrails and conditional verification rules | Reduce overclaim risk for enterprise repos |
