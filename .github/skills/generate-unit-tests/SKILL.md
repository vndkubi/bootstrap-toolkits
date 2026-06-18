---
name: generate-unit-tests
description: 'Generate Java tests using Real Core, Mock Boundaries: API component tests for REST/API behavior, direct domain unit tests for decision tables, isolated test DB for persistence, and boundary-only mocks. Outputs JUnit 5/AssertJ tests with AC-to-test mapping, @Nested grouping, @DisplayName, builders/fixtures, and reflection only as a legacy escape hatch. Use when asked to write Java tests, improve coverage, or replace mock-heavy tests.'
---

# Generate Unit Tests

Create Java tests that maximize confidence without mock-heavy internals.

Default testing model:

```text
Outside-in API Component Testing - Real Core, Mock Boundaries
```

For Java API behavior, this is not a pure isolated unit test. It is an API component test or in-process integration test: start at HTTP/in-memory host, run the real internal flow, and mock only dependencies outside the application boundary.

## When to Use

- Writing tests for new Java code.
- Improving test coverage for existing Java code.
- Replacing mock-heavy tests with better alternatives.
- Creating test builders and fixtures.
- Adding Java API behavior coverage through controller/resource -> service -> domain -> repository -> database.

For the detailed team standard, read `.github/docs/java-test-architecture.md`.

## Workflow

### Step 0: Choose Test Level

Use the smallest test level that proves the behavior:

| Behavior | Default test level | Rule |
|---|---|---|
| Public REST/API behavior | API component test | HTTP/in-memory host entry, real internals, isolated test DB |
| Domain calculation or state machine | Direct domain unit test | Cover the decision table without heavy API setup |
| Third-party adapter behavior | Contract test | Assert request/response mapping against sandbox, fixture, or mock server |
| Critical production journey | E2E smoke | Few tests only, close to production |

For API behavior, do not write a controller test that mocks the service. That proves wiring less effectively than a component test and hides business logic defects.

### Step 1: Analyze Target Behavior

1. Read the source class, API endpoint, or behavior to test.
2. Identify whether the behavior should be proven through API component tests, direct domain unit tests, or both.
3. Identify ALL branches: `if/else`, `switch`, ternary `? :`, `try/catch`, loops, `Optional.map/orElse`.
4. Count expected test cases:
   - API component tests: representative happy/error/transaction scenarios.
   - Domain unit tests: full decision table and edge cases.
5. Identify dependencies:
   - Real internal core: controller/resource, service/use case, domain, mapper, validator, repository, ORM.
   - Boundary doubles only: third-party API, payment/email/SMS/cloud provider, external identity provider, clock/random/UUID, unsafe side effects.

### Step 2: Create Test Builders

For each entity/DTO used as input, create or reuse a test builder:

```java
public class OrderBuilder {
    private Long id = 1L;
    private OrderStatus status = OrderStatus.CREATED;

    public static OrderBuilder anOrder() { return new OrderBuilder(); }
    public OrderBuilder withId(Long id) { this.id = id; return this; }
    public OrderBuilder withStatus(OrderStatus s) { this.status = s; return this; }
    public Order build() { /* construct and return */ }
}
```

### Step 3: Determine Real-Core Strategy

Priority order:

1. **Real objects** - use actual implementations for owned code.
2. **Test builders** - construct test data with builders.
3. **Isolated test database** - persistence behavior should use a real DB family via Testcontainers or equivalent when practical.
4. **Fakes** - simplified implementations for boundary ports.
5. **Mock HTTP server or stub adapter** - external dependencies only.
6. **Mocks** - interaction testing at boundaries only.
7. **Reflection** - private/protected access as a legacy escape hatch only.

Do not mock service classes, domain logic, mappers, validators, repositories, or ORM behavior inside the same business flow.

### Step 4: Write Tests

For direct domain unit tests:

```java
@DisplayName("Discount policy")
class DiscountPolicyTest {
    @Nested
    @DisplayName("VIP discount")
    class VipDiscount {
        @Test
        @DisplayName("should apply high discount when VIP order exceeds threshold")
        void shouldApplyHighDiscountWhenVipOrderExceedsThreshold() {
            // Arrange
            // Act
            // Assert
        }
    }
}
```

For API component tests:

```java
@DisplayName("Order API")
class OrderApiComponentTest {

    @Test
    @DisplayName("should create paid order when request is valid and payment is approved")
    void shouldCreatePaidOrderWhenRequestIsValidAndPaymentApproved() {
        // Arrange
        var user = database.givenUser();
        var product = database.givenProductWithStock(5);
        paymentServer.stubApprovedPayment();

        var request = new CreateOrderRequest(product.id(), 2, "payment-token");

        // Act
        var response = apiClient.post("/api/orders", authenticatedAs(user), request);

        // Assert API contract
        assertThat(response.status()).isEqualTo(201);
        assertThat(response.body().status()).isEqualTo("PAID");

        // Assert system state
        var order = database.findOrder(response.body().id());
        assertThat(order.quantity()).isEqualTo(2);
        assertThat(order.status()).isEqualTo(PAID);

        // Assert external boundary interaction
        paymentServer.verifyPaymentRequestedOnce(response.body().id(), product.price().multiply(2));
    }
}
```

### Step 5: Verify Coverage And Confidence

- [ ] All `if` branches: true and false.
- [ ] All `switch` cases plus default.
- [ ] All `try/catch` paths: success and exception.
- [ ] Null/empty inputs.
- [ ] Boundary values: 0, max, min.
- [ ] Loop: zero iterations, one, many.
- [ ] API behavior has representative full-flow coverage through HTTP/in-memory host.
- [ ] Persistence behavior uses an isolated test database, not repository mocks.
- [ ] Third-party failures are covered through boundary stubs/mock servers.
- [ ] Complex domain logic has direct unit tests for the full decision table.
- [ ] Reflection is absent, or centralized with a legacy debt note.

## Validation

- [ ] Tests compile and pass with the repo's actual Java test command, commonly `mvn test`, `mvn verify`, or `./gradlew test`.
- [ ] Zero unnecessary mocks; every mock is a boundary mock or explicitly justified legacy exception.
- [ ] All business branches covered at the right level.
- [ ] Test names describe behavior, not implementation.
- [ ] API component tests do not mock owned internal collaborators.
- [ ] Database state and external boundary interactions are asserted when relevant.

