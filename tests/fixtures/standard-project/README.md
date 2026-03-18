# Fixture: Standard Project — Java/Spring Boot E-Commerce

## Classification

**Standard** — 3 modules, ~80 source files, 3 domains

## Tech Stack

- Language: Java 17
- Framework: Spring Boot 3.2
- Build: Maven (multi-module)
- Database: PostgreSQL 15 + Flyway migrations
- Test: JUnit 5 + AssertJ + Mockito
- API: REST (Jackson)
- CI/CD: GitHub Actions

## Project Description

A Spring Boot e-commerce backend with 3 Maven modules: `catalog`, `orders`, `payments`. Represents a typical mid-size backend project with cross-domain interactions.

## Module Structure

```
standard-project/
├── pom.xml                         # Parent POM
├── catalog/
│   ├── pom.xml
│   └── src/main/java/com/shop/catalog/
│       ├── product/
│       │   ├── Product.java         # @Entity
│       │   ├── ProductRepository.java
│       │   ├── ProductService.java
│       │   └── ProductController.java
│       └── category/
│           ├── Category.java
│           └── CategoryRepository.java
├── orders/
│   ├── pom.xml
│   └── src/main/java/com/shop/orders/
│       ├── order/
│       │   ├── Order.java
│       │   ├── OrderItem.java
│       │   ├── OrderRepository.java
│       │   ├── OrderService.java
│       │   └── OrderController.java
│       └── dto/
│           ├── CreateOrderRequest.java
│           └── OrderResponse.java
├── payments/
│   ├── pom.xml
│   └── src/main/java/com/shop/payments/
│       ├── payment/
│       │   ├── Payment.java
│       │   ├── PaymentService.java
│       │   └── PaymentController.java
│       └── gateway/
│           └── StripeGatewayClient.java  # Feign client
├── .github/
│   └── workflows/
│       └── ci.yml
└── README.md
```

## Entities & Key Business Rules

**Product**: `{ id, sku, name, price, stockQuantity, categoryId, status }`
- SKU must be unique
- Price must be > 0
- Status: `ACTIVE | DRAFT | DISCONTINUED`

**Order**: `{ id, customerId, status, items, total, createdAt }`
- Status: `PENDING → CONFIRMED → SHIPPED → DELIVERED | CANCELLED`
- Cannot cancel SHIPPED or DELIVERED orders
- Total = sum of (item.price × item.quantity)

**Payment**: `{ id, orderId, amount, status, stripeChargeId }`
- Status: `PENDING → COMPLETED | FAILED | REFUNDED`
- Amount must match order total exactly

## Expected Bootstrap Output

### Classification
Standard → standard config

### Expected Agents (6)
- `dev-orchestrator`
- `implementor` — Spring Boot 3.2, Java 17, Maven specific
- `investigator` — com.shop package structure
- `test-specialist` — JUnit 5 + Mockito
- `code-reviewer` (orchestrates functional + technical)
- `functional-reviewer`
- `technical-reviewer`

### Expected Skills (7)
- `implement-feature` — Spring Boot layer order, `mvn clean verify -pl catalog`
- `generate-unit-tests` — JUnit5 + Mockito patterns
- `review-code-changes` — Spring/JPA focus
- `investigate-pbi` — 3-module awareness
- `generate-pr-description` — GitHub PR format
- `conventional-commit`
- `impact-analysis`

### Expected Instructions (5)
- `java.instructions.md` — Java 17+ sections MUST be present (Records, text blocks)
- `spring.instructions.md` — Spring Boot 3 patterns
- `testing.instructions.md`
- `database-migration.instructions.md` — Flyway
- `api-design.instructions.md`

### Expected Context Budget
- copilot-instructions.md: ~3 KB
- Total worst-case (java + spring + testing + implementor + skill): ~38 KB

## Validation Criteria

The bootstrap output PASSES if:
- [ ] `implementor.agent.md` mentions `Spring Boot 3.2`, `Java 17`, `com.shop`
- [ ] `java.instructions.md` contains Records and text blocks sections (Java 17 detected)
- [ ] `implement-feature` skill contains `mvn clean verify -pl` command pattern
- [ ] `order/Order.java` workflow (`PENDING → CONFIRMED → ...`) appears in copilot-instructions.md or order domain instructions
- [ ] `dev-orchestrator.agent.md` `agents:` list contains all 7 agent names
- [ ] `applyTo` in `java.instructions.md` is `**/*.java` (not broader)
- [ ] No mobile or PHP content in any generated file
