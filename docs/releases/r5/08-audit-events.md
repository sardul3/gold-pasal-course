---
id: r5-08
title: "Audit events"
release: r5
order: 8
prerequisites: [r5-07]
outcomes:
  - Define an AuditEvent and an AuditLog port with in-memory and PostgreSQL adapters
  - Record who did what, in the same transaction as the change
  - Prove the three events of a sale with a database query
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="A bangle was seeded, held, and sold. Six weeks later the owner asks who added it and who bought it. The R2 log line rotated away a month ago."
  destination="Every stock seed, hold, and order writes an audit_events row with actor, action, entity, and time, committed with the change it describes."
/>

# Audit events

An **audit event** is an append-only record: who did what to which thing, when. It differs from the R2 log line in two ways. It is a table, not a file, so it survives log rotation and can be queried. And it is written in the same transaction as the change, so an event without its change, or a change without its event, cannot exist.

## See the idea first

The shape, from `uv run python`:

```python
>>> from dataclasses import dataclass
>>> from datetime import UTC, datetime
>>> @dataclass(frozen=True)
... class AuditEvent:
...     at: datetime
...     actor: str
...     action: str
...     entity_type: str
...     entity_id: str
...
>>> AuditEvent(datetime(2026, 9, 21, 10, tzinfo=UTC), "staff", "stock_item.created", "stock_item", "GP-B-0001")
AuditEvent(at=datetime.datetime(2026, 9, 21, 10, 0, tzinfo=datetime.timezone.utc), actor='staff', action='stock_item.created', entity_type='stock_item', entity_id='GP-B-0001')
```

Five fields. `actor` is the principal's role name from the auth page. `action` is a dotted verb phrase the whole team agrees on. Nothing about request bodies, tokens, or customer details.

## The port and two adapters

Create `src/gold_pasal/audit.py`:

```python
"""Append-only audit events: who did what to which entity, and when."""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class AuditEvent:
    at: datetime
    actor: str
    action: str
    entity_type: str
    entity_id: str


class AuditLog(Protocol):
    def record(self, event: AuditEvent) -> None: ...


class InMemoryAuditLog:
    def __init__(self) -> None:
        self.events: list[AuditEvent] = []

    def record(self, event: AuditEvent) -> None:
        self.events.append(event)
```

One method. No `read`, no `delete`: an audit log is written by the application and read by people with database access. If a route ever needs to show history, that is a separate, read-only query with its own authorization.

The row in `src/gold_pasal/orm.py`:

```python
class AuditEventRow(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    actor: Mapped[str] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(40))
    entity_type: Mapped[str] = mapped_column(String(20))
    entity_id: Mapped[str] = mapped_column(String(40))
```

An integer `id` with `autoincrement` gives events an order that does not depend on clock precision. The adapter in `src/gold_pasal/postgres.py`:

```python
from gold_pasal.audit import AuditEvent
from gold_pasal.orm import AuditEventRow


class PostgresAuditLog:
    def __init__(self, session: Session) -> None:
        self._session = session

    def record(self, event: AuditEvent) -> None:
        self._session.add(
            AuditEventRow(
                at=event.at,
                actor=event.actor,
                action=event.action,
                entity_type=event.entity_type,
                entity_id=event.entity_id,
            )
        )
        self._session.flush()
```

Revision:

```bash
uv run alembic revision --autogenerate -m "audit events"
uv run ruff check --fix alembic && uv run ruff format alembic
uv run alembic upgrade head
```

## Record in the routes

The dependency, in `src/gold_pasal/api/dependencies.py`:

```python
from gold_pasal.audit import AuditLog
from gold_pasal.postgres import PostgresAuditLog, PostgresCatalog, PostgresInventory, PostgresOrders


def get_audit_log(request: Request, session: DbSession) -> AuditLog:
    if session is not None:
        return PostgresAuditLog(session)
    audit: AuditLog = request.app.state.audit_log
    return audit
```

It takes `DbSession` like the other repositories, so the audit row rides in the request's transaction. In `create_app`, add `audit_log: AuditLog | None = None` and `app.state.audit_log = audit_log if audit_log is not None else InMemoryAuditLog()`.

Now the three writes. In `src/gold_pasal/api/inventory.py`:

```python
from gold_pasal.api.dependencies import get_audit_log, get_clock, get_inventory
from gold_pasal.audit import AuditEvent, AuditLog

Audit = Annotated[AuditLog, Depends(get_audit_log)]


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=StockItemRead)
def create_stock_item(
    body: StockItemCreate, staff: Staff, inventory: Inventory, audit: Audit, now: Now
) -> StockItemRead:
    item = StockItem(stock_item_id=body.stock_item_id, sku=body.sku)
    inventory.add_stock_item(item)
    audit.record(
        AuditEvent(
            at=now(),
            actor=staff.name,
            action="stock_item.created",
            entity_type="stock_item",
            entity_id=item.stock_item_id,
        )
    )
    return StockItemRead(stock_item_id=item.stock_item_id, sku=item.sku)


@router.post("/holds", status_code=status.HTTP_201_CREATED, response_model=HoldRead)
def create_hold(
    body: HoldCreate, customer: Customer, inventory: Inventory, audit: Audit, now: Now
) -> HoldRead:
    hold = place_hold(
        inventory, stock_item_id=body.stock_item_id, ttl_seconds=body.ttl_seconds, now=now
    )
    audit.record(
        AuditEvent(
            at=now(),
            actor=customer.name,
            action="hold.placed",
            entity_type="hold",
            entity_id=hold.hold_id,
        )
    )
    return _hold_read(hold)
```

And in `src/gold_pasal/api/orders.py`, only when an order was created, not on replay:

```python
Audit = Annotated[AuditLog, Depends(get_audit_log)]


def create_order(..., audit: Audit, ...) -> OrderRead:
    result = checkout(...)
    if result.replayed:
        response.status_code = status.HTTP_200_OK
    else:
        audit.record(
            AuditEvent(
                at=result.order.created_at,
                actor=customer.name,
                action="order.created",
                entity_type="order",
                entity_id=result.order.order_id,
            )
        )
    return _order_read(result.order)
```

### Why in the route, not the service

`place_hold` and `checkout` know nothing about principals; they take a `customer` name only because the order stores one. The route is where the caller's identity and the change meet, so the route records the event. The service stays testable with fakes and no auth.

### Why in the transaction

`audit.record` calls `flush` on the same session the change used. If the route raises afterwards, both roll back. If the commit succeeds, both are committed. A background task or a second connection writing the event could lose it on a crash, or write it for a change that never committed. The R2 log line still fires and still rotates; the audit row is the durable copy.

## Prove it with a query

Extend `tests/inventory/test_checkout_db.py`; the whole file is on the [gate](09-release-gate-replay-safe-checkout):

```python
def test_checkout_commits_order_key_and_audit_in_one_transaction(
    client: TestClient, engine: Engine
) -> None:
    client.post("/api/inventory/items", json=NECKLACE, headers=STAFF)
    hold_id = client.post(
        "/api/inventory/holds", json={"stock_item_id": "GP-N-0001", "ttl_seconds": 900}, headers=CUSTOMER
    ).json()["hold_id"]
    headers = {**CUSTOMER, "Idempotency-Key": "checkout-db-0001"}
    body = {"hold_id": hold_id, "payment_reference": "stub-0001"}

    first = client.post("/api/orders", json=body, headers=headers)
    replay = client.post("/api/orders", json=body, headers=headers)

    assert (first.status_code, replay.status_code) == (201, 200)
    assert replay.json()["order_id"] == first.json()["order_id"]
    with engine.connect() as connection:
        orders = connection.execute(text("SELECT count(*) FROM orders")).scalar()
        keys = connection.execute(text("SELECT count(*) FROM idempotency_keys")).scalar()
        actions = connection.execute(
            text("SELECT action FROM audit_events ORDER BY id")
        ).scalars().all()
        hold_status = connection.execute(text("SELECT status FROM holds")).scalar()
    assert (orders, keys) == (1, 1)
    assert actions == ["stock_item.created", "hold.placed", "order.created"]
    assert hold_status == "consumed"
```

Three events in order, one order, one key, one consumed hold, after a checkout and a replay. The replay wrote no event, because nothing happened.

Update the `TRUNCATE` in `tests/inventory/conftest.py` to include the new tables:

```python
connection.execute(
    text("TRUNCATE audit_events, idempotency_keys, orders, holds, stock_items, catalog_items")
)
```

```bash
uv run pytest tests/inventory -m integration -q
```

In psql, the owner's question from the top of the page is one query:

```sql
SELECT at, actor, action, entity_id FROM audit_events WHERE entity_id = 'GP-B-0001' OR entity_id IN
  (SELECT hold_id FROM holds WHERE stock_item_id = 'GP-B-0001') ORDER BY id;
```

## What not to record

| Record | Do not record |
| --- | --- |
| actor role, action, entity type and id, time | the bearer token |
| | the request body |
| | a customer's name, phone, or address |
| | the payment reference (it is on the order already) |

An audit table is read by more people than the orders table and kept longer. Keep it boring. R11's agent will write to it through the same routes, with `actor` naming the agent, and the same rules apply.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Event exists but the change rolled back | Audit written on a different session | `get_audit_log` must take `DbSession` |
| No event after a successful write | `audit.record` not called on that route | Each of the three write routes records once |
| Two `order.created` events for one order | Recorded on the replay path too | Record only when `result.replayed` is false |
| `relation "audit_events" does not exist` | Migration not applied | `uv run alembic upgrade head` |
| Integration test sees events from an earlier test | `TRUNCATE` list missing `audit_events` | Add it |

## Practice

<LessonQuiz
  question="checkout raises PaymentDeclinedError after consume_hold. How many audit_events rows does that request leave?"
  a="One, hold consumption is a change"
  b="Zero; the route never reached audit.record, and the transaction rolled back anyway"
  c="One, with action payment.declined"
  d="Two"
  correct="b"
>

The route records `order.created` only after `checkout` returns. The exception skipped that line, and `get_session` rolled back the session. If the shop wants declined payments audited, that is a deliberate new event, written before re-raising, and it would need its own transaction to survive the rollback.

</LessonQuiz>

Next: [Release gate: replay-safe checkout](09-release-gate-replay-safe-checkout).

<EvidenceCard
  command="uv run pytest tests/inventory -m integration -q"
  artifact="audit.py with AuditEvent and AuditLog; PostgresAuditLog; audit_events revision; three events per sale"
  invariant="Every write leaves an audit row in the same transaction; a replay leaves none"
/>
