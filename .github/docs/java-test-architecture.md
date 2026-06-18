# Java Test Architecture

## Default Name

Use this team name for the default Java API behavior test design:

```text
Outside-in API Component Testing - Real Core, Mock Boundaries
```

Short rule:

```text
Run the real internal business flow. Mock only system boundaries.
```

This is not a pure isolated unit test. It is an API component test or in-process integration test because it exercises routing, serialization, validation, controller/resource code, application service, domain logic, repository/ORM, and an isolated test database.

## Default Java API Behavior Test

For REST/API behavior, prefer a test that sends a request through a test HTTP client or in-memory test host.

```text
HTTP request
  -> routing / middleware / auth / validation
  -> controller or resource
  -> application service / use case
  -> domain logic
  -> repository / ORM
  -> isolated test database
  -> HTTP response
```

Keep these real by default:

- routing and middleware
- request and response serialization
- validation and exception mapping
- controller/resource
- application service/use case
- domain logic
- mapper/converter
- repository and ORM mapping
- database, through an isolated test database

Use test doubles only at boundaries:

- third-party HTTP APIs
- payment, email, SMS, cloud services
- external identity provider, with a test identity when policy behavior matters
- clock, random, UUID, or other non-deterministic sources
- message brokers when a container is not needed for the behavior under test

## Database Strategy

The database is a special dependency. Prefer the same database family as production in an isolated test environment, normally via Testcontainers or an equivalent local container.

Each test should create only the minimum fixture data needed for the scenario. Avoid a large shared seed that every test depends on.

Reset state between tests with one of:

1. transaction rollback when the whole flow shares the same transaction boundary
2. truncate tables in dependency order
3. a schema reset tool
4. separate schema/database per parallel test worker

## Direct Domain Unit Tests

Direct unit tests are still required for pure logic with a large input space:

- pricing, tax, discount, or money rules
- date/time rules
- state machines
- permission matrices
- boundary-heavy algorithms
- decision tables that would require too many API setup combinations

Use API component tests for representative full-flow confidence and direct domain unit tests for the full decision table.

## Reflection Rule

Reflection and partial mocks are escape hatches, not the default strategy.

Prefer:

1. constructor injection
2. interface/port around an external dependency
3. factory or configuration injection
4. fake implementation
5. mock HTTP server
6. package-private/internal test seam
7. reflection or partial mock

If reflection is unavoidable for legacy code, centralize it in one helper and add a debt note that names the production seam to introduce later.

