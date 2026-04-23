---
name: generate-api-flow-tests
description: "Stack-agnostic skill that converts a contract + acceptance criteria into red API-flow tests against the locally booted stack. Detects the test stack from repo evidence (JUnit/REST Assured, xUnit/WebApplicationFactory, pytest/httpx, Jest/supertest, Go stdlib). Invoked by @api-test-author during autorun Phase 3."
---

# Generate API Flow Tests

Turns a reviewed contract and acceptance criteria into a red test suite that runs against the real stack.

## When to Use

- `@api-test-author` Phase 3 primary tool.
- Standalone: when adding contract coverage to an existing repo.

## Inputs

- `contracts/<protocol>.{yaml|graphql|proto}` — reviewed contract.
- `spec.md` — ACs with ids.
- `baseUrl` — from `run-local-stack` healthcheck output.
- `featureWorkspace` — `specs/<id>-<slug>/`.

## Stack Detection

Scan for the first match in this order:

| Signal file + content | Stack | Test client |
|---|---|---|
| `pom.xml` has `junit-jupiter` + `rest-assured` | Java JUnit 5 | REST Assured |
| `pom.xml` has `spring-boot-starter-test` (no REST Assured) | Java JUnit 5 | WebTestClient or MockMvc |
| `*.csproj` has `Microsoft.AspNetCore.Mvc.Testing` | .NET xUnit | `WebApplicationFactory<TProgram>` |
| `pyproject.toml` has `pytest` + `httpx` | Python pytest | `httpx.AsyncClient` |
| `pyproject.toml` has `pytest` + `requests` | Python pytest | `requests.Session` |
| `package.json` has `jest` + `supertest` | Node Jest | `supertest` |
| `package.json` has `vitest` + `supertest` | Node Vitest | `supertest` |
| `go.mod` | Go stdlib | `net/http/httptest` |

No match → emit gate `test-stack-unknown` and halt.

## Workflow

1. **Parse contract.** Extract: operation id, path + method (REST) / query-mutation name (GraphQL) / rpc name (gRPC) / channel + op (AsyncAPI), request schema, response schema, error responses.
2. **Parse spec.md.** Collect ACs with ids. Cross-reference each AC with an operation via `description` field grep (the convention set by `generate-api-contract`).
3. **Choose target directory** per stack convention. Create if missing.
4. **Emit one test file per resource**. Template per stack:

### REST (Java + REST Assured)

```java
package com.example.api;

import io.restassured.RestAssured;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.given;
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
import static org.hamcrest.Matchers.equalTo;

class WidgetApiFlowTest {

    @BeforeAll
    static void setBaseUrl() {
        RestAssured.baseURI = System.getProperty("app.baseUrl", "http://localhost:8080");
    }

    @Test
    @DisplayName("AC-US-B1-02: POST /widgets returns 201")
    void should_create_widget_per_AC_US_B1_02() {
        given().contentType("application/json").body("""
            { "name": "alpha" }
            """)
        .when().post("/widgets")
        .then()
            .statusCode(201)
            .body("id", equalTo(1))
            .body(matchesJsonSchemaInClasspath("contracts/schemas/WidgetResponse.json"));
    }
}
```

### REST (.NET + WebApplicationFactory)

```csharp
public class WidgetApiFlowTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public WidgetApiFlowTests(WebApplicationFactory<Program> f) => _client = f.CreateClient();

    [Fact(DisplayName = "AC-US-B1-02: POST /widgets returns 201")]
    public async Task Should_Create_Widget_Per_AC_US_B1_02()
    {
        var resp = await _client.PostAsJsonAsync("/widgets", new { name = "alpha" });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
```

### REST (Python + httpx)

```python
import pytest, httpx

@pytest.mark.asyncio
async def test_post_widget_per_AC_US_B1_02(base_url: str):
    """AC-US-B1-02: POST /widgets returns 201."""
    async with httpx.AsyncClient(base_url=base_url) as c:
        resp = await c.post("/widgets", json={"name": "alpha"})
    assert resp.status_code == 201
    assert resp.json()["id"] is not None
```

### GraphQL

Use the same client, POST to `/graphql`, assert on `data.<op>` shape.

### gRPC

Generate client stub from `.proto`, call the rpc, assert on the response message fields.

### AsyncAPI / event-driven

Produce a message to the test topic using the project's native producer (KafkaTemplate, `aiokafka`, `@nestjs/microservices`); assert the consumer's side-effect (HTTP callback, DB row, outgoing message) within a bounded timeout (default 10s).

5. **Add a fixture file** under the stack's fixture folder with `{resource}-valid.json`. Delegate richer data to `@mock-data-specialist`.
6. **Run the suite.** Expected outcome: all primary tests red with contract-relevant failure (404, 500, missing field). Any green primary test → gate `test-premature-green`.
7. **Emit `test-coverage.md`.**

## Failure Modes

| Condition | Gate id |
|---|---|
| Stack not detected | `test-stack-unknown` |
| AC has no matching contract op | `contract-ac-mismatch` |
| Primary test green before prod code | `test-premature-green` |
| Stack booted but base URL unreachable from test process | `quickstart-healthcheck-failed` (re-raise) |

## Verification

- Golden Java repo: generator produces `WidgetApiFlowTest.java`, Maven `test` fails with 404 on POST /widgets → ✅ expected red.
- Golden .NET repo: same, xUnit test fails with 404.
- Golden Python repo: pytest fails with 404.
- Negative: pre-implemented endpoint → `test-premature-green` fires.
