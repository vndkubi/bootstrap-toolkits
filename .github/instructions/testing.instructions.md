---
description: "Java unit testing standards with JUnit 5, minimal mocking, strong branch coverage on changed logic, and fast execution."
applyTo: "**/*Test*.java"
---

# Java Unit Testing Standards

## Core Expectations

- Prefer real objects over mocks when practical.
- Use builders or factories for complex test data.
- Name tests by business scenario, not implementation detail.
- Cover changed logic, edge cases, and critical regression paths.

## Structure

- Group related tests with `@Nested`.
- Use `@DisplayName` where it improves readability.
- Follow Arrange / Act / Assert.

## Mocking Priority

1. real objects
2. builders/factories
3. fakes
4. stubs for true external dependencies
5. mocks for interaction assertions only

Do not mock what you own unless there is a strong reason.

## Coverage Guidance

Target strong branch coverage on the changed behavior:

- both sides of important conditionals
- relevant switch cases
- success and failure paths
- null/empty/boundary inputs
- regression cases tied to the change

Aim for 100% branch coverage on changed critical logic when practical. Do not claim blanket 100% coverage by default.

## Performance

- Keep unit tests fast.
- Prefer focused unit tests over slow integration-style setups unless the behavior truly needs integration coverage.
