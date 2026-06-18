---
description: "Java testing standards for Real Core, Mock Boundaries: API component tests for full-flow behavior, direct unit tests for domain decision tables, minimal boundary-only mocking, strong branch coverage, and fast feedback."
applyTo: "**/*Test*.java"
---

# Java Testing Standards

## Core Expectations

- For Java API behavior, default to **Outside-in API Component Testing - Real Core, Mock Boundaries**.
- Send requests through a test HTTP client or in-memory test host when behavior crosses controller/resource boundaries.
- Keep internal collaborators real by default: routing, validation, controller/resource, service/use case, domain logic, mapper, repository, ORM, and isolated test database.
- Mock only system boundaries: third-party APIs, payment/email/SMS/cloud providers, external identity providers, clock/random/UUID, and unsafe or non-deterministic side effects.
- Use builders or factories for complex test data.
- Name tests by business scenario, not implementation detail.
- Cover changed logic, edge cases, and critical regression paths.

See `.github/docs/java-test-architecture.md` for the detailed strategy.

## Test Taxonomy

- `api-component`: HTTP or in-memory host entry, real internal core, isolated test DB, boundary mocks only. This is the main confidence path for API behavior.
- `domain-unit`: direct tests for pure domain logic, decision tables, state machines, pricing, tax, discounts, date/time rules, and permission matrices.
- `contract`: adapter/provider contract tests for third-party integrations.
- `e2e`: a small number of critical journey smoke tests in an environment close to production.

## Structure

- Group related tests with `@Nested`.
- Use `@DisplayName` where it improves readability.
- Follow Arrange / Act / Assert.

## Mocking Priority

1. real objects
2. builders/factories
3. fakes
4. isolated test database for persistence behavior
5. mock HTTP server or stub adapter for true external dependencies
6. mocks for interaction assertions only
7. reflection or partial mock as a legacy escape hatch only

Do not mock what you own inside the same business flow. Do not mock service classes, domain objects, mappers, validators, repositories, or ORM behavior in API component tests.

## Database Guidance

- Prefer the production database family in an isolated test environment, normally via Testcontainers or equivalent.
- Apply production migrations when practical.
- Reset state between tests with transaction rollback, truncation, schema reset, or per-worker schema/database isolation.
- Avoid large shared seeds. Each test should create only the data required for that scenario.

## Coverage Guidance

Target strong branch coverage on the changed behavior:

- both sides of important conditionals
- relevant switch cases
- success and failure paths
- null/empty/boundary inputs
- regression cases tied to the change

Aim for 100% branch coverage on changed critical logic when practical. Do not claim blanket 100% coverage by default.

## Performance

- Keep direct domain unit tests fast and framework-light.
- Keep API component suites bounded and scenario-driven; do not duplicate every domain decision-table case through HTTP.
- Use representative API component scenarios plus direct unit tests for combinatorial logic.

