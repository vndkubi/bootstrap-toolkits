---
description: 'Python coding standards for Django/FastAPI/Flask, SQLAlchemy/Django ORM, type hints, async patterns, testing with pytest, and PEP compliance.'
applyTo: '**/*.py, **/pyproject.toml, **/requirements*.txt'
---

# Python Development Standards

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Module | snake_case | `order_service.py` |
| Package | snake_case | `order_management/` |
| Class | PascalCase | `OrderService` |
| Function/Method | snake_case | `get_order_by_id()` |
| Variable | snake_case | `order_total` |
| Constant | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Private | _prefix | `_internal_method()` |
| Type variable | PascalCase | `T = TypeVar('T')` |
| Enum member | UPPER_SNAKE | `OrderStatus.PENDING` |

## PEP Compliance

- **PEP 8**: Style guide — enforced by `ruff` or `black`
- **PEP 257**: Docstring conventions
- **PEP 484**: Type hints — use everywhere
- **PEP 585**: Use `list[str]` instead of `List[str]`
- **PEP 604**: Use `X | None` instead of `Optional[X]`
- **PEP 695**: Type aliases with `type` keyword (Python 3.12+)

## Project Structure (FastAPI)

```
src/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI app factory
│   ├── config.py              # Settings with pydantic-settings
│   ├── dependencies.py        # Dependency injection
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── orders.py
│   │   │   │   └── customers.py
│   │   │   └── schemas/
│   │   │       ├── order.py   # Pydantic models (DTOs)
│   │   │       └── customer.py
│   │   └── deps.py
│   ├── core/
│   │   ├── security.py
│   │   └── exceptions.py
│   ├── models/                # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── order.py
│   │   └── customer.py
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── order_repository.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── order_service.py
│   └── db/
│       ├── session.py
│       └── migrations/        # Alembic
tests/
├── conftest.py
├── unit/
├── integration/
└── e2e/
pyproject.toml
```

## Project Structure (Django)

```
src/
├── project_name/
│   ├── __init__.py
│   ├── settings/
│   │   ├── base.py
│   │   ├── local.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── orders/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py     # DRF serializers
│   │   ├── views.py           # or viewsets.py
│   │   ├── urls.py
│   │   ├── services.py        # Business logic
│   │   ├── selectors.py       # Read queries
│   │   ├── tests/
│   │   │   ├── test_models.py
│   │   │   ├── test_services.py
│   │   │   └── test_views.py
│   │   └── migrations/
│   └── customers/
manage.py
pyproject.toml
```

## FastAPI Patterns

### Router
```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.v1.schemas.order import OrderCreate, OrderResponse
from app.services.order_service import OrderService
from app.dependencies import get_order_service

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.get_by_id(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_in: OrderCreate,
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    return await service.create(order_in)
```

### Pydantic Schemas (DTOs)
```python
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class OrderBase(BaseModel):
    customer_id: int
    notes: str | None = None

class OrderCreate(OrderBase):
    items: list[OrderItemCreate] = Field(..., min_length=1)

class OrderResponse(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: OrderStatus
    total: Decimal
    created_at: datetime
    items: list[OrderItemResponse]
```

### SQLAlchemy Model
```python
from sqlalchemy import String, Numeric, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.PENDING)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    customer: Mapped["Customer"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
```

## Django Patterns

### Model
```python
from django.db import models

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        SHIPPED = "shipped", "Shipped"

    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "status"]),
        ]
```

### DRF ViewSet
```python
from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.orders.serializers import OrderSerializer
from apps.orders.services import OrderService

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.select_related("customer").prefetch_related("items").all()

    def perform_create(self, serializer):
        OrderService.create_order(serializer.validated_data, user=self.request.user)
```

## Type Hints — Mandatory

```python
# Always use type hints for function signatures
def calculate_discount(order: Order, customer: Customer) -> Decimal:
    ...

# Use modern syntax (Python 3.10+)
def process_items(items: list[OrderItem]) -> dict[str, int]:
    ...

# Union types
def find_order(order_id: int) -> Order | None:
    ...

# Use TypeVar for generics
T = TypeVar("T", bound=BaseModel)
async def get_or_404(model: type[T], pk: int) -> T:
    ...
```

## Error Handling

- Define custom exceptions per domain
- Use exception handlers at the framework boundary
- Never catch broad `Exception` in business logic
- Always log exceptions with context
- Return structured error responses:
  ```python
  class AppException(Exception):
      def __init__(self, code: str, message: str, status_code: int = 400):
          self.code = code
          self.message = message
          self.status_code = status_code
  ```

## Async Best Practices

- Use `async/await` for I/O-bound operations (HTTP calls, DB queries)
- Use `asyncio.gather()` for concurrent independent operations
- Never mix sync and async — use `sync_to_async` only as a bridge
- Use `httpx.AsyncClient` instead of `requests` in async code
- Always close async resources: `async with httpx.AsyncClient() as client:`

## Database & Migrations

- Use Alembic (SQLAlchemy) or Django migrations — never modify DB manually
- Autogenerate migrations, then review before applying
- Always include downgrade in Alembic migrations
- Use database transactions for multi-step operations
- Optimize queries: use `select_related`/`prefetch_related` (Django) or `joinedload`/`selectinload` (SQLAlchemy)
- Index frequently queried columns

## Testing (pytest)

```python
import pytest
from unittest.mock import AsyncMock

class TestOrderService:
    @pytest.fixture
    def order_service(self, mock_repo: AsyncMock) -> OrderService:
        return OrderService(repository=mock_repo)

    async def test_get_by_id_returns_order_when_found(self, order_service, mock_repo):
        # Arrange
        expected = Order(id=1, status=OrderStatus.PENDING)
        mock_repo.get_by_id.return_value = expected

        # Act
        result = await order_service.get_by_id(1)

        # Assert
        assert result == expected
        mock_repo.get_by_id.assert_called_once_with(1)

    async def test_get_by_id_raises_not_found(self, order_service, mock_repo):
        mock_repo.get_by_id.return_value = None

        with pytest.raises(OrderNotFoundException):
            await order_service.get_by_id(999)
```

- Use `pytest` with `pytest-asyncio` for async tests
- Use `pytest-cov` for coverage reporting
- Use `factory_boy` or `model-bakery` for test data
- Use `pytest.fixture` for shared setup
- Prefer fakes/stubs over mocks when possible
- Test naming: `test_<method>_<scenario>_<expected_result>`

## Dependency Management

- Use `pyproject.toml` as the single source of truth
- Pin dependencies in `requirements.txt` or use `uv.lock` / `poetry.lock`
- Separate dev dependencies: `[project.optional-dependencies.dev]`
- Use `uv` or `poetry` for dependency management
- Run `pip-audit` or `safety` for vulnerability scanning
- Specify Python version: `requires-python = ">=3.11"`

## Code Quality

- Use `ruff` for linting AND formatting (replaces flake8, isort, black)
- Use `mypy` for static type checking (strict mode)
- Use `pre-commit` hooks for automated checks
- Target 90%+ test coverage with `pytest-cov`
- Document public APIs with docstrings (Google or NumPy style)

## Security

- Never trust user input — validate with Pydantic or DRF serializers
- Use parameterized queries (ORMs handle this, but beware raw SQL)
- Hash passwords with `bcrypt` or `argon2`
- Use environment variables for secrets — never hardcode
- Enable CORS with specific origins — never `allow_origins=["*"]` in production
- Use `python-jose` or `PyJWT` for JWT with proper expiration
- Rate limit API endpoints with `slowapi` or DRF throttling
