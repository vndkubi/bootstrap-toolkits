---
description: 'Finance-oriented Java review rules for regulated enterprise systems. Covers money correctness, transaction integrity, authorization, data handling, auditability, Jakarta EE, and JUnit review expectations.'
applyTo: '**/*.java'
---

# Java Finance Review Rules

Use these rules when reviewing Java changes in finance, banking, payment,
pricing, account, ledger, reconciliation, authorization, or regulated-data
contexts. Apply them as a risk lens on top of the general Java, Jakarta EE,
security, logging, error-handling, and testing instructions.

## P0 Review Rules

- Monetary values must use `BigDecimal` or a domain money type. Scale and
  rounding must be explicit in finance-critical calculations.
- Do not use `double`, `float`, or `new BigDecimal(double)` for money.
- Authorization must be enforced in the service/business operation, not only in
  REST, UI, gateway, or client code.
- SQL, JPQL, HQL, and native queries must use parameters for untrusted input.
- Do not log tokens, passwords, secrets, account numbers, PAN/card data, or
  unnecessary PII. Use redaction or irreversible references plus correlation IDs.
- Write-heavy finance entities need stale-write protection through `@Version`,
  explicit locking, idempotency keys, compare-and-set semantics, or an equivalent
  domain mechanism.
- Keep write transactions short. Do not hold database transactions open across
  partner HTTP calls, slow messaging waits, or unbounded external I/O.
- Public API, DTO, event, error-format, and schema changes must be backward
  compatible or have a versioning and rollout plan.
- Finance-critical acceptance criteria must map to code and meaningful tests.
- Audit events must allow reconstruction of sensitive business actions without
  leaking forbidden data.

## Jakarta EE Review Rules

- Validate request shape with Bean Validation at the boundary.
- Keep business validation, authorization, and state transitions in the owning
  service/domain layer.
- Default JPA associations to lazy loading. Do not add eager collection fetching
  without a use-case-specific query or entity graph.
- Add `@Version` to JPA entities that can be concurrently updated unless another
  explicit concurrency strategy exists.
- Use consistent JAX-RS exception mappers and stable machine-readable error codes.
- Treat persistence context, flush timing, rollback, and detached entity behavior
  as review-relevant in finance flows.

## JUnit Review Rules

- Prefer JUnit Jupiter for new tests when the project supports JUnit 5.
- Keep JUnit 4/Vintage only as a bridge for existing legacy tests.
- Finance-critical tests must include meaningful assertions for happy, negative,
  boundary, authorization, stale/concurrent update, and failure paths where
  relevant.
- Avoid `Thread.sleep()` in tests. Prefer fake clocks, deterministic
  synchronization, latches, or polling helpers with timeouts.
- Do not rely on mocks that bypass the state transition or money calculation
  under review.

## Review Comment Rules

Every blocker or warning must include:

- The concrete file and line or code surface.
- The production, security, compliance, or money-correctness consequence.
- A specific fix or migration path.
- Verification expected after the fix.

Do not spend human review time on style-only issues that configured linters can
enforce.

