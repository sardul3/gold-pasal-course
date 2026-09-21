---
id: r5-05
title: "Turn a hold into an order"
release: r5
order: 5
prerequisites: [r5-04]
outcomes:
  - Extend the InventoryRepository port with consume_hold and implement it with SELECT ... FOR UPDATE
  - Write an OrdersRepository port, an in-memory fake, and a PostgreSQL adapter with an orders table
  - Serve POST /api/orders for customers so a hold becomes an order in one transaction
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="The necklace is on hold and the customer says yes. Nothing turns that hold into a sale. If two checkouts for the same hold arrive together, the unique index from R4 does not help: both rows already exist."
  destination="POST /api/orders with a hold_id consumes the hold and creates an order, atomically. A second checkout of the same hold is a 409 hold-not-active problem."
/>

# Turn a hold into an order

**Checkout** consumes an active hold and creates an order. Two writes, one outcome: both happen or neither does. This page extends the R4 port with one method, adds an orders port with two adapters, writes the service that uses them, and puts a route in front. It also meets the second concurrency tool, `SELECT ... FOR UPDATE`, because "only one checkout per hold" is a change to an existing row, which a unique index cannot police.

## See the idea first

The service, before its dependencies exist:

```python
def checkout(inventory, orders, *, hold_id, customer, payment_reference, now):
    moment = now()
    hold = inventory.consume_hold(hold_id, now=moment)      # ACTIVE -> CONSUMED, or raise
    stock_item = inventory.get_stock_item(hold.stock_item_id)
    order = Order(..., status=OrderStatus.PENDING_PAYMENT, created_at=moment)
    orders.add(order)
    return order
```

Read it as a story: lock the hold, mark it consumed, build the order, save it. The route wraps it in a transaction; if anything raises, `get_session` rolls it all back and the hold is active again.

## Extend the inventory port

Add two exceptions to `src/gold_pasal/errors.py`:

```python
class HoldNotActiveError(InventoryError):
    def __init__(self, hold_id: str, status: str) -> None:
        super().__init__(f"hold {hold_id!r} is {status}, not active")
        self.hold_id = hold_id
```

(`UnknownHoldError` already exists from R4.) In `src/gold_pasal/inventory.py`, add a method to the Protocol:

```python
class InventoryRepository(Protocol):
    ...
    def consume_hold(self, hold_id: str, *, now: datetime) -> Hold: ...
```

Run pyright:

```bash
uv run pyright
```

```text
error: "PostgresInventory" is incompatible with protocol "InventoryRepository"
    "consume_hold" is not present (reportReturnType)
```

That error is the point of a Protocol: every adapter must follow, and the type checker lists them. Give the fake its implementation first:

```python
    def consume_hold(self, hold_id: str, *, now: datetime) -> Hold:
        hold = self.get_hold(hold_id)
        if not hold.is_active(now):
            raise HoldNotActiveError(hold_id, hold.status.value)
        consumed = replace(hold, status=HoldStatus.CONSUMED)
        self._holds[hold_id] = consumed
        return consumed
```

Then the PostgreSQL adapter in `src/gold_pasal/postgres.py`:

```python
    def consume_hold(self, hold_id: str, *, now: datetime) -> Hold:
        row = self._session.scalar(
            select(HoldRow).where(HoldRow.hold_id == hold_id).with_for_update()
        )
        if row is None:
            raise UnknownHoldError(hold_id)
        hold = _to_hold(row)
        if not hold.is_active(now):
            raise HoldNotActiveError(hold_id, hold.status.value)
        row.status = HoldStatus.CONSUMED.value
        self._session.flush()
        return _to_hold(row)
```

### FOR UPDATE

`.with_for_update()` adds `FOR UPDATE` to the `SELECT`: PostgreSQL locks the hold's row until this transaction commits or rolls back. A second checkout for the same hold runs the same `SELECT` and waits. When the first commits, the second's `SELECT` returns the row as it is now, `consumed`, and `is_active` is false, so it raises `HoldNotActiveError`. Without the lock, both would read `active`, both would set `consumed`, and two orders would exist for one necklace.

R4's partial unique index solved "at most one row like this". This is "at most one change to this row", and a row lock is the tool. The two are not interchangeable: an index cannot express a status transition, and a lock on every insert would serialise unrelated customers.

## The orders port

Append to `src/gold_pasal/orders.py`:

```python
import logging
from typing import Protocol
from uuid import uuid4

from gold_pasal.errors import UnknownOrderError
from gold_pasal.inventory import Clock, InventoryRepository, utc_now

logger = logging.getLogger(__name__)


class OrdersRepository(Protocol):
    def add(self, order: Order) -> None: ...

    def get(self, order_id: str) -> Order: ...


def checkout(
    inventory: InventoryRepository,
    orders: OrdersRepository,
    *,
    hold_id: str,
    customer: str,
    payment_reference: str,
    now: Clock = utc_now,
) -> Order:
    """Consume an active hold and create an order."""
    moment = now()
    hold = inventory.consume_hold(hold_id, now=moment)
    stock_item = inventory.get_stock_item(hold.stock_item_id)
    order = Order(
        order_id=f"order-{uuid4().hex[:12]}",
        hold_id=hold.hold_id,
        stock_item_id=stock_item.stock_item_id,
        sku=stock_item.sku,
        customer=customer,
        payment_reference=payment_reference,
        status=OrderStatus.PENDING_PAYMENT,
        created_at=moment,
    )
    orders.add(order)
    logger.info("order created order_id=%s sku=%s customer=%s", order.order_id, order.sku, customer)
    return order


class InMemoryOrders:
    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}

    def add(self, order: Order) -> None:
        self._orders[order.order_id] = order

    def get(self, order_id: str) -> Order:
        try:
            return self._orders[order_id]
        except KeyError:
            raise UnknownOrderError(order_id) from None
```

The order starts `PENDING_PAYMENT`. The [payment page](07-payment-behind-a-port) adds the gateway call and the `transition` to `PAID`; the [idempotency page](06-idempotency-keys) adds the key. Each page changes `checkout` by a few lines, and the gate shows the finished function.

## Rows, adapter, migration

Add to `src/gold_pasal/orm.py`:

```python
class OrderRow(Base):
    __tablename__ = "orders"

    order_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    hold_id: Mapped[str] = mapped_column(ForeignKey("holds.hold_id"), unique=True)
    stock_item_id: Mapped[str] = mapped_column(ForeignKey("stock_items.stock_item_id"))
    sku: Mapped[str] = mapped_column(String(40))
    customer: Mapped[str] = mapped_column(String(40))
    payment_reference: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
```

`hold_id` is `unique=True`: even if every lock failed, the database would refuse a second order for one hold. Belt and braces, and the braces are declarative.

The adapter, in `src/gold_pasal/postgres.py`:

```python
class PostgresOrders:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, order: Order) -> None:
        self._session.add(
            OrderRow(
                order_id=order.order_id,
                hold_id=order.hold_id,
                stock_item_id=order.stock_item_id,
                sku=order.sku,
                customer=order.customer,
                payment_reference=order.payment_reference,
                status=order.status.value,
                created_at=order.created_at,
            )
        )
        self._session.flush()

    def get(self, order_id: str) -> Order:
        row = self._session.get(OrderRow, order_id)
        if row is None:
            raise UnknownOrderError(order_id)
        return Order(
            order_id=row.order_id,
            hold_id=row.hold_id,
            stock_item_id=row.stock_item_id,
            sku=row.sku,
            customer=row.customer,
            payment_reference=row.payment_reference,
            status=OrderStatus(row.status),
            created_at=row.created_at.astimezone(UTC),
        )
```

The migration, with `DATABASE_URL` exported:

```bash
uv run alembic revision --autogenerate -m "orders"
uv run ruff check --fix alembic && uv run ruff format alembic
uv run alembic upgrade head
```

```text
INFO  [alembic.autogenerate.compare.tables] Detected added table 'orders'
```

Read the file, check `downgrade` drops the table, then apply.

## Route

Add to `src/gold_pasal/api/schemas.py`:

```python
class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hold_id: str = Field(min_length=3, max_length=40)
    payment_reference: str = Field(min_length=1, max_length=80)


class OrderRead(BaseModel):
    order_id: str
    hold_id: str
    stock_item_id: str
    sku: str
    status: str
    payment_reference: str
    created_at: datetime
```

A dependency in `src/gold_pasal/api/dependencies.py`:

```python
from gold_pasal.orders import OrdersRepository
from gold_pasal.postgres import PostgresCatalog, PostgresInventory, PostgresOrders


def get_orders(request: Request, session: DbSession) -> OrdersRepository:
    if session is not None:
        return PostgresOrders(session)
    orders: OrdersRepository = request.app.state.orders
    return orders
```

Create `src/gold_pasal/api/orders.py`:

```python
"""Checkout: turn an active hold into an order."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from gold_pasal.api.auth import Caller, Customer
from gold_pasal.api.dependencies import get_clock, get_inventory, get_orders
from gold_pasal.api.schemas import OrderCreate, OrderRead
from gold_pasal.inventory import Clock, InventoryRepository
from gold_pasal.orders import Order, OrdersRepository, checkout

router = APIRouter(prefix="/api/orders", tags=["orders"])

Inventory = Annotated[InventoryRepository, Depends(get_inventory)]
Orders = Annotated[OrdersRepository, Depends(get_orders)]
Now = Annotated[Clock, Depends(get_clock)]


def _order_read(order: Order) -> OrderRead:
    return OrderRead(
        order_id=order.order_id,
        hold_id=order.hold_id,
        stock_item_id=order.stock_item_id,
        sku=order.sku,
        status=order.status.value,
        payment_reference=order.payment_reference,
        created_at=order.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=OrderRead)
def create_order(
    body: OrderCreate, customer: Customer, inventory: Inventory, orders: Orders, now: Now
) -> OrderRead:
    order = checkout(
        inventory,
        orders,
        hold_id=body.hold_id,
        customer=customer.name,
        payment_reference=body.payment_reference,
        now=now,
    )
    return _order_read(order)


@router.get("/{order_id}", response_model=OrderRead)
def read_order(order_id: str, _: Caller, orders: Orders) -> OrderRead:
    return _order_read(orders.get(order_id))
```

`customer: Customer` both protects the route and supplies `customer.name` for the order. `inventory` and `orders` share the request's session through `get_session`, so `consume_hold` and `orders.add` are one transaction.

In `create_app`, add an `orders` parameter and state defaulting to `InMemoryOrders()`, and `app.include_router(orders_router)`. Add three problem handlers: `UnknownHoldError` 404 `unknown-hold` (if not already there), `UnknownOrderError` 404 `unknown-order`, `HoldNotActiveError` 409 `hold-not-active`, and `InvalidTransitionError` 409 `invalid-transition`.

## Try it

```bash
STAFF=$(grep STAFF .env | cut -d= -f2); CUSTOMER=$(grep CUSTOMER .env | cut -d= -f2)
curl -s -X POST http://127.0.0.1:8000/api/inventory/items -H "Authorization: Bearer $STAFF" -H "content-type: application/json" -d '{"stock_item_id":"GP-B-0001","sku":"GP-BANGLE-0001"}' > /dev/null
HOLD=$(curl -s -X POST http://127.0.0.1:8000/api/inventory/holds -H "Authorization: Bearer $CUSTOMER" -H "content-type: application/json" -d '{"stock_item_id":"GP-B-0001","ttl_seconds":900}' | python3 -c "import json,sys; print(json.load(sys.stdin)['hold_id'])")
curl -s -X POST http://127.0.0.1:8000/api/orders -H "Authorization: Bearer $CUSTOMER" -H "content-type: application/json" -d "{\"hold_id\":\"$HOLD\",\"payment_reference\":\"stub-0001\"}"
```

```text
{"order_id":"order-f3313c62d70f","hold_id":"hold-e79e2db3aea9","stock_item_id":"GP-B-0001","sku":"GP-BANGLE-0001","status":"pending_payment","payment_reference":"stub-0001","created_at":"2026-09-21T12:50:10.168251Z"}
```

Run the last `curl` again:

```text
{"type":"https://gold-pasal.example/problems/hold-not-active","title":"Hold not active","status":409,"detail":"hold 'hold-e79e2db3aea9' is consumed, not active"}
```

The hold was consumed by the first checkout. `GET /api/inventory/holds/<id>` confirms `"status":"consumed"`. That second call is what a retried request looks like today: an error. The next page makes a retry return the first order instead.

## Unit tests through the fakes

Create `tests/unit/orders/test_checkout_service.py`:

```python
from datetime import UTC, datetime

import pytest

from gold_pasal.errors import HoldNotActiveError
from gold_pasal.inventory import HoldStatus, InMemoryInventory, StockItem, place_hold
from gold_pasal.orders import InMemoryOrders, OrderStatus, checkout

T0 = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)


def now() -> datetime:
    return T0


@pytest.fixture
def inventory() -> InMemoryInventory:
    repo = InMemoryInventory()
    repo.add_stock_item(StockItem("GP-N-0001", "GP-NECKLACE-0001"))
    return repo


@pytest.fixture
def hold_id(inventory: InMemoryInventory) -> str:
    return place_hold(inventory, stock_item_id="GP-N-0001", ttl_seconds=900, now=now).hold_id


def test_checkout_consumes_the_hold_and_creates_an_order(
    inventory: InMemoryInventory, hold_id: str
) -> None:
    orders = InMemoryOrders()

    order = checkout(
        inventory, orders, hold_id=hold_id, customer="customer", payment_reference="stub-1", now=now
    )

    assert order.status is OrderStatus.PENDING_PAYMENT
    assert order.sku == "GP-NECKLACE-0001"
    assert inventory.get_hold(hold_id).status is HoldStatus.CONSUMED


def test_a_consumed_hold_cannot_be_bought_again(inventory: InMemoryInventory, hold_id: str) -> None:
    orders = InMemoryOrders()
    checkout(inventory, orders, hold_id=hold_id, customer="customer", payment_reference="s", now=now)

    with pytest.raises(HoldNotActiveError, match="consumed"):
        checkout(inventory, orders, hold_id=hold_id, customer="customer", payment_reference="s", now=now)
```

```bash
uv run pytest tests/unit/orders -q
```

Seven passed, with the state-machine tests. The fake enforces the same "consumed cannot be consumed" rule the `FOR UPDATE` path enforces on PostgreSQL, so the service is tested without a database and the adapter is tested with one on the [gate](09-release-gate-replay-safe-checkout).

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| pyright: `"consume_hold" is not present` | An adapter missing the new method | Implement it on the fake and on `PostgresInventory` |
| Two orders for one hold under load | `with_for_update()` missing | Lock the hold row in `consume_hold` |
| `IntegrityError` on `orders.hold_id` | The unique constraint caught what the lock should have | Same fix; the constraint is the backstop |
| Order created but hold still active | Two sessions, or the route committed early | Both adapters must use the request's `DbSession` |
| `403` on checkout | Not a customer token | `Customer` on the route; staff cannot buy |
| `relation "orders" does not exist` | Migration not applied | `uv run alembic upgrade head` |

## Practice

<LessonQuiz
  question="Two checkouts for the same active hold run at the same time on two workers. What makes the second one fail?"
  a="The partial unique index on holds"
  b="SELECT ... FOR UPDATE: the second waits for the first's transaction, then reads the hold as consumed and raises HoldNotActiveError"
  c="A Python lock in checkout"
  d="The orders table has no primary key"
  correct="b"
>

The index only prevents a second active hold row; here there is one row changing status. The row lock serialises the two transactions, and the loser sees the winner's result. The unique `hold_id` on `orders` would catch it too, one layer later.

</LessonQuiz>

Next: [Idempotency keys](06-idempotency-keys), so a retried checkout returns the first order instead of a 409.

<EvidenceCard
  command="uv run pytest tests/unit/orders -q && uv run alembic current"
  artifact="consume_hold with FOR UPDATE on both adapters; OrdersRepository, InMemoryOrders, PostgresOrders; orders revision; POST /api/orders"
  invariant="A hold becomes an order in one transaction, and only once"
/>
