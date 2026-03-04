---
description: 'Java coding standards for enterprise applications. Naming conventions, error handling, logging, null safety, and code organization.'
applyTo: '**/*.java'
---

# Java Coding Standards

## Naming Conventions

- **Classes**: `PascalCase` — `OrderService`, `CustomerRepository`
- **Methods/Variables**: `camelCase` — `findById`, `customerName`
- **Constants**: `UPPER_SNAKE_CASE` — `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`
- **Packages**: lowercase, dot-separated — `com.company.project.orders`
- **Enums**: `PascalCase` type, `UPPER_SNAKE_CASE` values — `OrderStatus.PENDING`

## Imports

```java
// ❌ Avoid wildcard imports
import java.util.*;

// ✅ Prefer explicit imports
import java.util.List;
import java.util.Optional;
import java.util.Map;
```

Import ordering:
1. `java.*`
2. `javax.*` / `jakarta.*`
3. Third-party libraries
4. Project-internal packages
5. Static imports (last)

## Null Safety

```java
// ❌ Avoid returning null
public Customer findById(Long id) {
    return em.find(Customer.class, id); // may return null
}

// ✅ Use Optional for nullable returns
public Optional<Customer> findById(Long id) {
    return Optional.ofNullable(em.find(Customer.class, id));
}

// ❌ Don't use Optional as parameter
public void process(Optional<String> name) { }

// ✅ Use @Nullable annotation or overload
public void process(@Nullable String name) { }
```

## Error Handling

```java
// ✅ Use custom exception hierarchy with error codes
public class BusinessException extends RuntimeException {
    private final String errorCode;

    public BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}

// ✅ Specific exceptions for specific cases
public class EntityNotFoundException extends BusinessException {
    public EntityNotFoundException(String entity, Long id) {
        super("NOT_FOUND", entity + " with ID " + id + " not found");
    }
}

// ❌ Avoid catching generic Exception
try { ... } catch (Exception e) { ... }

// ✅ Catch specific exceptions
try { ... } catch (EntityNotFoundException e) { ... }
```

## Logging

```java
// ✅ SLF4J with parameterized messages
private static final Logger log = LoggerFactory.getLogger(OrderService.class);

log.info("Processing order {} for customer {}", orderId, customerId);
log.error("Failed to process order {}", orderId, exception);
log.debug("Order details: {}", order);

// ❌ Avoid string concatenation in logs
log.info("Processing order " + orderId); // evaluates even when INFO disabled
```

## Method Design

- Maximum 30 lines per method (excluding blank lines and comments)
- One responsibility per method
- Maximum 4 parameters — use an object for more
- Early return for guard clauses

```java
// ✅ Early return pattern
public OrderDto processOrder(Long orderId) {
    Order order = repository.findById(orderId)
        .orElseThrow(() -> new EntityNotFoundException("Order", orderId));

    if (order.isProcessed()) {
        return mapper.toDto(order); // early return
    }

    order.process();
    repository.save(order);
    return mapper.toDto(order);
}
```

## Object Construction

```java
// ✅ Builder pattern for objects with many fields
var response = OrderResponse.builder()
    .id(order.getId())
    .status(order.getStatus())
    .total(order.getTotal())
    .createdAt(order.getCreatedAt())
    .build();
```

## Resource Management

```java
// ✅ Try-with-resources for AutoCloseable
try (var connection = dataSource.getConnection();
     var statement = connection.prepareStatement(sql)) {
    // use resources
}
```

## Documentation

```java
// ✅ JavaDoc for public API methods
/**
 * Creates a new order for the given customer.
 *
 * @param request the order creation request with customer and items
 * @return the created order DTO
 * @throws EntityNotFoundException if the customer does not exist
 * @throws BusinessException if validation fails
 */
public OrderDto createOrder(CreateOrderRequest request) { }
```
