# Java Finance Enterprise Review Checklist

Use this pack for Java enterprise pull requests in regulated finance contexts.
Apply it together with `functional-core.md` and `technical-core.md` when the change
touches money, authorization, transactions, customer data, audit trails, shared
contracts, migrations, or high-volume processing.

## Apply When

- Money, fee, tax, pricing, settlement, ledger, reconciliation, or posting logic changed.
- Authorization, authentication, entitlement, approval workflow, or service boundary changed.
- Jakarta EE resources, services, repositories, transactions, JPA entities, or migrations changed.
- Public DTOs, API contracts, error formats, event payloads, or shared libraries changed.
- PII, account identifiers, card data, tokens, secrets, audit events, or logs changed.
- Tests for finance-critical behavior changed or were added.

## Risk Classes

| Class | Examples | Required review |
|---|---|---|
| Low | Local refactor, documentation, test-only change with no production behavior impact | One reviewer and standard CI |
| Medium | Local service or repository logic with no public contract or schema impact | One owning reviewer and full CI |
| High | Money, pricing, payment, authorization, migration, shared API, PII, batch, concurrency, or critical dependency | Scope plan, code owner, two independent reviewers, full security gates |
| Critical | Ledger/posting/reconciliation, authorization framework, crypto, emergency hotfix in regulated flow | High plus domain, security/data, and release-owner escalation |

Risk is based on blast radius and business criticality, not changed line count.
A tiny diff can be High or Critical if it changes a shared contract, state
transition, transaction boundary, authorization rule, or financial calculation.

## Planning Triggers

Run review scope planning before deep review when any of these are true:

- The PR touches payment, pricing, ledger, settlement, reconciliation, authorization, or PII.
- The PR changes a shared DTO, public endpoint, event schema, migration, base class, filter, or interceptor.
- Business context confidence is Medium or Low.
- The change mixes refactoring with behavior change.
- Caller or downstream consumer impact is not obvious from the diff.

## P0 Checks

P0 findings block merge until fixed or formally waived by the release owner and
the accountable domain/security owner.

| Category | Reviewer question | Evidence expected |
|---|---|---|
| Money math | Are monetary values represented with `BigDecimal` or a domain money type, with explicit scale and rounding? | Tests for scale, rounding, boundary values, and negative cases |
| Transaction integrity | Are external calls kept out of long write transactions? Are idempotency, rollback, retry, and compensation semantics clear? | Transaction boundary notes and tests for failure or duplicate submission paths |
| Authorization | Is authorization enforced in the service/business layer, not only at REST or UI boundaries? | Tests for allowed and denied access paths |
| Injection | Are SQL, JPQL, HQL, and native queries parameterized instead of built from input strings? | Query code and tests covering hostile input |
| Sensitive logging | Are tokens, credentials, account numbers, PAN/card data, secrets, and unnecessary PII excluded or redacted from logs and URLs? | Log sample, redaction helper, or test evidence |
| Optimistic locking | Do concurrent write paths use `@Version`, explicit locking, idempotency keys, or an equivalent stale-write control? | Entity mapping and stale/concurrent update test |
| API/schema compatibility | Are DTO, endpoint, status code, error format, event, and database schema changes backward-compatible or versioned? | Contract diff, migration plan, or downstream coordination note |
| Java runtime compatibility | For Java 8/11 estates, did the change avoid relying on APIs, tool versions, or removed Java EE modules unsupported by the runtime? | Build file, compiler target, and CI result |
| Business traceability | Does each changed acceptance criterion or finance rule map to code and meaningful tests? | AC-to-code-to-test mapping |
| Auditability | Can the system reconstruct who did what, when, for which request/entity, without leaking forbidden data? | Audit event fields, correlation ID propagation, and retention/masking note |

## P1 Checks

P1 findings should be fixed before merge unless the reviewer accepts a tracked
follow-up with a clear owner and deadline.

| Category | Reviewer question | Evidence expected |
|---|---|---|
| Error handling | Are error codes stable, exception mappers consistent, and internal stack traces hidden from clients? | Error response examples and tests |
| Timeout and retry | Do HTTP, database, messaging, and partner calls have explicit timeouts? Are retries limited to safe or idempotent operations? | Client configuration and failure tests |
| Performance | Are N+1 queries, unnecessary eager collection loading, missing pagination, broad scans, and large in-memory loads avoided? | Query shape, pagination proof, index note, or performance evidence |
| Dependency hygiene | Are new or upgraded dependencies justified, supported by the runtime, and free of unwaived high/critical vulnerabilities? | SCA/dependency report and dependency rationale |
| Test quality | Do tests cover happy, invalid, boundary, failure, authorization, and concurrency paths where relevant? | JUnit test locations and assertion review |
| Observability | Are request IDs, correlation IDs, metrics, traces, and key business events available for operational diagnosis? | Logging/metrics/tracing evidence |
| Layering | Are validation, business rules, authorization, persistence, and external integration kept in the owning layer? | Caller/dependency review and absence of duplicated validation |
| Migration safety | Are large-table migrations online, batched, reversible where possible, and tested with realistic volume? | Migration notes, rollback/backfill strategy, and table-size estimate |

## P2 Checks

P2 findings improve reviewability and long-term maintenance.

- Keep PRs coherent; split pure refactor from behavior change when practical.
- Prefer clear names, small methods, and localized complexity over cleverness.
- Use comments only where they explain non-obvious domain or technical constraints.
- Modernize tests toward JUnit Jupiter for new work; keep Vintage/JUnit 4 only as a migration bridge when the project still needs it.
- Promote repeated accepted review findings into durable checklist or instruction updates.

## Java 8/11 Review Lens

- Use `BigDecimal` or a domain money type for money; avoid `double`, `float`, and `new BigDecimal(double)`.
- Use `java.time` types for new date/time code; make timezone, offset, and boundary semantics explicit.
- Protect shared mutable state with clear synchronization, immutable data, or concurrent collections as appropriate.
- Do not assume Java EE APIs are present in the JDK when targeting Java 11; declare required dependencies explicitly.
- Check tool runtime compatibility before adopting latest plugin or analyzer versions in Java 8/11 builds.

## Jakarta EE Review Lens

- Keep `@Transactional` scope minimal and avoid partner HTTP calls, messaging waits, and long CPU work inside write transactions.
- Default JPA associations to lazy loading; never add eager collection loading without a use-case-specific query or entity graph.
- Add `@Version` or an equivalent concurrency control to write-heavy finance entities.
- Validate DTOs at the boundary with Bean Validation; keep business validation in the service/domain layer.
- Use consistent JAX-RS exception mapping and stable error response formats.
- Parameterize JPQL/HQL/native queries and avoid cross-domain table or entity reach-through.

## JUnit Review Lens

- Prefer Jupiter style for new tests when the project supports JUnit 5.
- Use JUnit 4/Vintage only to keep legacy tests running during migration.
- Prefer scenario names and meaningful assertions over implementation-detail tests.
- Use `assertThrows`, parameterized tests, and nested tests where they clarify scenarios.
- Avoid `Thread.sleep()` in tests; use fake clocks, latches, polling helpers, or deterministic synchronization.
- Do not over-mock owned domain objects; use real objects, builders, fakes, or stubs first.

## Blocker Comment Template

```markdown
### BLOCKER: <category> - `<file>:<line>`

**Problem**
Describe the exact issue and the production, security, or compliance consequence.

**Why it matters**
Tie the issue to money correctness, authorization, data integrity, auditability,
availability, or backward compatibility.

**Suggested fix**
Give the concrete fix or migration path.

**Verification**
Name the test, scan result, contract diff, or operational evidence expected after
the fix.
```

## Common Blocker Snippets

```markdown
BLOCKER: Monetary code uses binary floating point. Finance paths must use
BigDecimal or a domain money type with explicit scale and rounding. Add tests
for rounding, boundary values, and invalid values.
```

```markdown
BLOCKER: The external partner call is inside a write transaction. This extends
the lock window and makes partial failure harder to reason about. Move network
I/O outside the transaction and keep only the state mutation transactional.
```

```markdown
BLOCKER: Authorization is enforced only at the REST layer. The service can be
called from other paths, so the business-layer operation must enforce the same
authorization rule and include allowed/denied tests.
```

```markdown
BLOCKER: This log statement exposes sensitive data. Redact or hash the value,
keep a correlation ID, and add evidence that tokens, account numbers, card data,
or secrets are not emitted.
```

