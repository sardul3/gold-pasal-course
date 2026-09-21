---
id: r4-06
title: "Stock items and holds in a transaction"
release: r4
order: 6
prerequisites: [r4-05]
outcomes:
  - Model StockItem, Hold, and HoldStatus with an InventoryRepository port and an in-memory fake
  - Write place_hold with an injected clock and a PostgresInventory adapter
  - Serve POST /api/inventory/items and /holds so a hold is a committed row
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory lead"
  problem="A customer wants the tilhari necklace held for fifteen minutes while she fetches her mother. The shop has serial-numbered pieces, not quantities, and a hold on a piece that does not exist must never be created."
  destination="POST /api/inventory/items seeds a physical piece; POST /api/inventory/holds reserves it with an expiry; both are rows that survive a restart; a hold for an unknown piece is a 404 problem."
/>

# Stock items and holds in a transaction

A **stock item** is one physical piece with a serial number: this necklace, not "necklaces". A **hold** is a temporary claim on one stock item until a moment in time. This page builds the domain, the port, the fake, the PostgreSQL adapter, and the routes, in that order, the same shape as the catalog. The clock is a parameter from the start, so R6 can test expiry without waiting fifteen minutes.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from datetime import UTC, datetime, timedelta
>>> T0 = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)
>>> expires_at = T0 + timedelta(seconds=900)
>>> expires_at
datetime.datetime(2026, 9, 21, 10, 15, tzinfo=datetime.timezone.utc)
>>> expires_at > T0 + timedelta(seconds=901)
False
```

A hold is `expires_at = now + ttl`, and "active" is `expires_at > now`. Everything on this page is arithmetic on those two moments, plus rows to keep them in. Always `tzinfo=UTC`: comparing a naive datetime with an aware one raises in Python 3.12, and the database column is `TIMESTAMPTZ`.

## The domain

Add three exceptions to `src/gold_pasal/errors.py`:

```python
class InventoryError(Exception):
    """Base class for stock and hold failures."""


class UnknownStockItemError(InventoryError, LookupError):
    def __init__(self, stock_item_id: str) -> None:
        super().__init__(f"no stock item {stock_item_id!r}")
        self.stock_item_id = stock_item_id


class UnknownHoldError(InventoryError, LookupError):
    def __init__(self, hold_id: str) -> None:
        super().__init__(f"no hold {hold_id!r}")
        self.hold_id = hold_id


class DuplicateStockItemError(InventoryError):
    def __init__(self, stock_item_id: str) -> None:
        super().__init__(f"stock item {stock_item_id!r} already exists")
        self.stock_item_id = stock_item_id


class ReservationConflictError(InventoryError):
    def __init__(self, stock_item_id: str) -> None:
        super().__init__(f"stock item {stock_item_id!r} already has an active hold")
        self.stock_item_id = stock_item_id
```

Create `src/gold_pasal/inventory.py`:

```python
"""Stock items, holds, and the port that stores them."""

from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Protocol
from uuid import uuid4

from gold_pasal.errors import (
    DuplicateStockItemError,
    ReservationConflictError,
    UnknownHoldError,
    UnknownStockItemError,
)

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


class HoldStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CONSUMED = "consumed"


@dataclass(frozen=True)
class StockItem:
    """One physical, serial-numbered piece on the tray."""

    stock_item_id: str
    sku: str


@dataclass(frozen=True)
class Hold:
    """A temporary claim on one stock item until expires_at."""

    hold_id: str
    stock_item_id: str
    status: HoldStatus
    expires_at: datetime

    def is_active(self, now: datetime) -> bool:
        return self.status is HoldStatus.ACTIVE and self.expires_at > now


class InventoryRepository(Protocol):
    def add_stock_item(self, item: StockItem) -> None: ...

    def get_stock_item(self, stock_item_id: str) -> StockItem: ...

    def add_hold(self, hold: Hold, *, now: datetime) -> Hold: ...

    def get_hold(self, hold_id: str) -> Hold: ...


def place_hold(
    inventory: InventoryRepository,
    *,
    stock_item_id: str,
    ttl_seconds: int,
    now: Clock = utc_now,
) -> Hold:
    """Reserve one stock item. Raises UnknownStockItemError or ReservationConflictError."""
    item = inventory.get_stock_item(stock_item_id)
    moment = now()
    hold = Hold(
        hold_id=f"hold-{uuid4().hex[:12]}",
        stock_item_id=item.stock_item_id,
        status=HoldStatus.ACTIVE,
        expires_at=moment + timedelta(seconds=ttl_seconds),
    )
    return inventory.add_hold(hold, now=moment)


class InMemoryInventory:
    """Dict-backed fake with the same conflict rule the database enforces."""

    def __init__(self) -> None:
        self._items: dict[str, StockItem] = {}
        self._holds: dict[str, Hold] = {}

    def add_stock_item(self, item: StockItem) -> None:
        if item.stock_item_id in self._items:
            raise DuplicateStockItemError(item.stock_item_id)
        self._items[item.stock_item_id] = item

    def get_stock_item(self, stock_item_id: str) -> StockItem:
        try:
            return self._items[stock_item_id]
        except KeyError:
            raise UnknownStockItemError(stock_item_id) from None

    def add_hold(self, hold: Hold, *, now: datetime) -> Hold:
        for existing in self._holds.values():
            if existing.stock_item_id != hold.stock_item_id:
                continue
            if existing.status is HoldStatus.ACTIVE and existing.expires_at <= now:
                self._holds[existing.hold_id] = replace(existing, status=HoldStatus.EXPIRED)
            elif existing.is_active(now):
                raise ReservationConflictError(hold.stock_item_id)
        self._holds[hold.hold_id] = hold
        return hold

    def get_hold(self, hold_id: str) -> Hold:
        try:
            return self._holds[hold_id]
        except KeyError:
            raise UnknownHoldError(hold_id) from None
```

### What to notice

`Clock = Callable[[], datetime]` names "a function that returns the time". `place_hold` takes one and defaults to the real clock. A test passes a function that returns a fixed moment, and expiry becomes arithmetic the test controls. Do not call `datetime.now()` inside domain code; ask the clock you were given.

`HoldStatus` has three values. A hold that runs out becomes `EXPIRED`; one that turns into an order (R5) becomes `CONSUMED`. Only `ACTIVE` blocks another customer. Keeping expired and consumed holds as rows gives the shop history; only the active one is unique.

`add_hold` in the fake does two things: marks any stale active hold for the same item as expired (lazy expiry, so no background job is needed), then refuses if an active hold remains. The PostgreSQL adapter below does the same two steps in SQL. The fake carries the rule so the unit tests can prove it in milliseconds.

## Unit tests on the fake

Create `tests/unit/inventory/test_place_hold.py`:

```python
from datetime import UTC, datetime, timedelta

import pytest

from gold_pasal.errors import ReservationConflictError, UnknownStockItemError
from gold_pasal.inventory import HoldStatus, InMemoryInventory, StockItem, place_hold

T0 = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)


class FrozenClock:
    """A clock the test moves by hand."""

    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now

    def advance(self, seconds: int) -> None:
        self.now += timedelta(seconds=seconds)


@pytest.fixture
def inventory() -> InMemoryInventory:
    repo = InMemoryInventory()
    repo.add_stock_item(StockItem("GP-N-0001", "GP-NECKLACE-0001"))
    return repo


def test_hold_expires_ttl_seconds_after_now(inventory: InMemoryInventory) -> None:
    clock = FrozenClock(T0)

    hold = place_hold(inventory, stock_item_id="GP-N-0001", ttl_seconds=900, now=clock)

    assert hold.status is HoldStatus.ACTIVE
    assert hold.expires_at == T0 + timedelta(seconds=900)


def test_second_hold_on_a_held_item_conflicts(inventory: InMemoryInventory) -> None:
    clock = FrozenClock(T0)
    place_hold(inventory, stock_item_id="GP-N-0001", ttl_seconds=900, now=clock)

    with pytest.raises(ReservationConflictError, match="GP-N-0001"):
        place_hold(inventory, stock_item_id="GP-N-0001", ttl_seconds=900, now=clock)


def test_an_expired_hold_frees_the_item(inventory: InMemoryInventory) -> None:
    clock = FrozenClock(T0)
    first = place_hold(inventory, stock_item_id="GP-N-0001", ttl_seconds=60, now=clock)

    clock.advance(61)
    second = place_hold(inventory, stock_item_id="GP-N-0001", ttl_seconds=60, now=clock)

    assert second.hold_id != first.hold_id
    assert inventory.get_hold(first.hold_id).status is HoldStatus.EXPIRED


def test_unknown_stock_item_is_rejected_before_any_hold(inventory: InMemoryInventory) -> None:
    with pytest.raises(UnknownStockItemError):
        place_hold(inventory, stock_item_id="GP-N-MISSING", ttl_seconds=900)
```

```bash
uv run pytest tests/unit/inventory -q
```

```text
....                                                                     [100%]
4 passed in 0.03s
```

`FrozenClock` is callable, so it satisfies `Clock`, and it has an `advance` method the test uses to move time. Sixty-one seconds pass in no time at all.

## The PostgreSQL adapter

Append to `src/gold_pasal/postgres.py`:

```python
from datetime import UTC, datetime

from sqlalchemy import select, update

from gold_pasal.errors import (
    DuplicateStockItemError,
    ReservationConflictError,
    UnknownHoldError,
    UnknownStockItemError,
)
from gold_pasal.inventory import Hold, HoldStatus, StockItem
from gold_pasal.orm import HoldRow, StockItemRow


class PostgresInventory:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add_stock_item(self, item: StockItem) -> None:
        if self._session.get(StockItemRow, item.stock_item_id) is not None:
            raise DuplicateStockItemError(item.stock_item_id)
        self._session.add(StockItemRow(stock_item_id=item.stock_item_id, sku=item.sku))
        self._session.flush()

    def get_stock_item(self, stock_item_id: str) -> StockItem:
        row = self._session.get(StockItemRow, stock_item_id)
        if row is None:
            raise UnknownStockItemError(stock_item_id)
        return StockItem(stock_item_id=row.stock_item_id, sku=row.sku)

    def add_hold(self, hold: Hold, *, now: datetime) -> Hold:
        self._session.execute(
            update(HoldRow)
            .where(
                HoldRow.stock_item_id == hold.stock_item_id,
                HoldRow.status == HoldStatus.ACTIVE.value,
                HoldRow.expires_at <= now,
            )
            .values(status=HoldStatus.EXPIRED.value)
        )
        active = self._session.scalar(
            select(HoldRow).where(
                HoldRow.stock_item_id == hold.stock_item_id,
                HoldRow.status == HoldStatus.ACTIVE.value,
            )
        )
        if active is not None:
            raise ReservationConflictError(hold.stock_item_id)
        self._session.add(
            HoldRow(
                hold_id=hold.hold_id,
                stock_item_id=hold.stock_item_id,
                status=hold.status.value,
                expires_at=hold.expires_at,
            )
        )
        self._session.flush()
        return hold

    def get_hold(self, hold_id: str) -> Hold:
        row = self._session.get(HoldRow, hold_id)
        if row is None:
            raise UnknownHoldError(hold_id)
        return _to_hold(row)


def _to_hold(row: HoldRow) -> Hold:
    return Hold(
        hold_id=row.hold_id,
        stock_item_id=row.stock_item_id,
        status=HoldStatus(row.status),
        expires_at=row.expires_at.astimezone(UTC),
    )
```

Merge the imports with the ones already at the top of the file; ruff will sort them.

`add_hold` is the fake's logic as three statements: an `UPDATE` that expires stale holds, a `SELECT` for a remaining active one, an `INSERT`. All inside the request's transaction. `row.expires_at.astimezone(UTC)` normalises what PostgreSQL returns, because a `TIMESTAMPTZ` comes back in the connection's timezone, and the API should always say `Z`.

Read the `SELECT` then `INSERT` again. It is correct when requests arrive one at a time. The next page shows what happens when two arrive together, and why the fix is not in Python.

## Schemas, dependencies, routes

Append to `src/gold_pasal/api/schemas.py` (add `from datetime import datetime` at the top):

```python
class StockItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stock_item_id: str = Field(min_length=3, max_length=40, pattern=r"^[A-Z0-9-]+$")
    sku: str = Field(min_length=3, max_length=40, pattern=r"^[A-Z0-9-]+$")


class StockItemRead(BaseModel):
    stock_item_id: str
    sku: str


class HoldCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stock_item_id: str = Field(min_length=3, max_length=40)
    ttl_seconds: int = Field(ge=60, le=86_400, description="how long the hold lasts")


class HoldRead(BaseModel):
    hold_id: str
    stock_item_id: str
    status: str
    expires_at: datetime
```

Add two dependencies to `src/gold_pasal/api/dependencies.py`:

```python
from gold_pasal.inventory import Clock, InventoryRepository
from gold_pasal.postgres import PostgresCatalog, PostgresInventory


def get_inventory(request: Request, session: DbSession) -> InventoryRepository:
    if session is not None:
        return PostgresInventory(session)
    inventory: InventoryRepository = request.app.state.inventory
    return inventory


def get_clock(request: Request) -> Clock:
    clock: Clock = request.app.state.clock
    return clock
```

Create `src/gold_pasal/api/inventory.py`:

```python
"""Inventory routes: seed stock items and place holds."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from gold_pasal.api.dependencies import get_clock, get_inventory
from gold_pasal.api.schemas import HoldCreate, HoldRead, StockItemCreate, StockItemRead
from gold_pasal.inventory import Clock, Hold, InventoryRepository, StockItem, place_hold

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

Inventory = Annotated[InventoryRepository, Depends(get_inventory)]
Now = Annotated[Clock, Depends(get_clock)]


def _hold_read(hold: Hold) -> HoldRead:
    return HoldRead(
        hold_id=hold.hold_id,
        stock_item_id=hold.stock_item_id,
        status=hold.status.value,
        expires_at=hold.expires_at,
    )


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=StockItemRead)
def create_stock_item(body: StockItemCreate, inventory: Inventory) -> StockItemRead:
    item = StockItem(stock_item_id=body.stock_item_id, sku=body.sku)
    inventory.add_stock_item(item)
    return StockItemRead(stock_item_id=item.stock_item_id, sku=item.sku)


@router.post("/holds", status_code=status.HTTP_201_CREATED, response_model=HoldRead)
def create_hold(body: HoldCreate, inventory: Inventory, now: Now) -> HoldRead:
    hold = place_hold(
        inventory, stock_item_id=body.stock_item_id, ttl_seconds=body.ttl_seconds, now=now
    )
    return _hold_read(hold)


@router.get("/holds/{hold_id}", response_model=HoldRead)
def read_hold(hold_id: str, inventory: Inventory) -> HoldRead:
    return _hold_read(inventory.get_hold(hold_id))
```

In `create_app`, add `inventory` and `clock` parameters and state, and include the router:

```python
from gold_pasal.api.inventory import router as inventory_router
from gold_pasal.inventory import Clock, InMemoryInventory, InventoryRepository, utc_now


def create_app(
    *,
    session_factory: sessionmaker[Session] | None = None,
    catalog: CatalogRepository | None = None,
    inventory: InventoryRepository | None = None,
    clock: Clock = utc_now,
) -> FastAPI:
    ...
    app.state.inventory = inventory if inventory is not None else InMemoryInventory()
    app.state.clock = clock
    ...
    app.include_router(inventory_router)
```

And three handlers in `register_problem_handlers`:

```python
    @app.exception_handler(UnknownStockItemError)
    async def unknown_stock_item(_: Request, exc: UnknownStockItemError) -> JSONResponse:
        return problem_response(
            slug="unknown-stock-item", title="Unknown stock item", status=404, detail=str(exc)
        )

    @app.exception_handler(UnknownHoldError)
    async def unknown_hold(_: Request, exc: UnknownHoldError) -> JSONResponse:
        return problem_response(slug="unknown-hold", title="Unknown hold", status=404, detail=str(exc))

    @app.exception_handler(DuplicateStockItemError)
    async def duplicate_stock_item(_: Request, exc: DuplicateStockItemError) -> JSONResponse:
        return problem_response(
            slug="duplicate-stock-item", title="Duplicate stock item", status=409, detail=str(exc)
        )

    @app.exception_handler(ReservationConflictError)
    async def reservation_conflict(_: Request, exc: ReservationConflictError) -> JSONResponse:
        return problem_response(
            slug="reservation-conflict",
            title="Reservation conflict",
            status=409,
            detail=str(exc),
        )
```

`/reservation-conflict` is the `type` suffix the course's R4 check looks for.

```bash
uv run ruff format . && uv run ruff check . && uv run pyright && uv run pytest -q
```

Green, and `/openapi.json` now lists `/api/inventory/items`, `/api/inventory/holds`, and `/api/inventory/holds/{hold_id}`.

## Hold a necklace

With `DATABASE_URL` exported and uvicorn running:

```bash
curl -s -X POST http://127.0.0.1:8000/api/inventory/items \
  -H "content-type: application/json" \
  -d '{"stock_item_id":"GP-N-0001","sku":"GP-NECKLACE-0001"}'
curl -s -X POST http://127.0.0.1:8000/api/inventory/holds \
  -H "content-type: application/json" \
  -d '{"stock_item_id":"GP-N-0001","ttl_seconds":900}'
```

```text
{"stock_item_id":"GP-N-0001","sku":"GP-NECKLACE-0001"}
{"hold_id":"hold-03ff9bd1a3e2","stock_item_id":"GP-N-0001","status":"active","expires_at":"2026-09-21T12:56:07.080426Z"}
```

Hold it again:

```text
{"type":"https://gold-pasal.example/problems/reservation-conflict","title":"Reservation conflict","status":409,"detail":"stock item 'GP-N-0001' already has an active hold"}
```

Hold something that does not exist:

```bash
curl -s -i -X POST http://127.0.0.1:8000/api/inventory/holds \
  -H "content-type: application/json" \
  -d '{"stock_item_id":"GP-N-MISSING","ttl_seconds":900}' | head -1
```

```text
HTTP/1.1 404 Not Found
```

Restart uvicorn and `GET /api/inventory/holds/hold-03ff9bd1a3e2`. Still `active`. In psql, `SELECT hold_id, status, expires_at FROM holds;` shows it with the timestamp in your local zone; same instant.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `TypeError: can't compare offset-naive and offset-aware datetimes` | A naive `datetime.now()` somewhere | `datetime.now(UTC)`, and `T0` with `tzinfo=UTC` |
| `ProgrammingError: relation "holds" does not exist` | Migration not applied | `uv run alembic upgrade head` |
| Hold created for an unknown stock item | Adapter skipped `get_stock_item` | `place_hold` looks the item up first; the foreign key also refuses |
| Every hold is a 409 after the first, forever | Expiry never runs | The `UPDATE ... expires_at <= now` must precede the `SELECT` |
| `expires_at` comes back with `+05:45` | Connection timezone | `astimezone(UTC)` in `_to_hold` |
| pyright: `PostgresInventory` incompatible with `InventoryRepository` | Method missing or signature drift | Four methods, keyword-only `now` |

## Practice

<LessonQuiz
  question="A hold with ttl 60 was placed at 10:00:00 with a frozen clock. The clock now reads 10:01:00 exactly. Is the item free?"
  a="Yes; sixty seconds have passed"
  b="No; is_active is expires_at > now, and 10:01:00 > 10:01:00 is false, so the hold is inactive and the item is free"
  c="No; the hold is active until 10:01:01"
  d="It depends on the database timezone"
  correct="b"
>

`expires_at` is `10:01:00`. `is_active` requires `expires_at > now`; at exactly `10:01:00` that is false, so the hold has expired and a new one can be placed. The boundary is inclusive on the expiry side, and the test with `advance(61)` stays clear of it on purpose.

</LessonQuiz>

Next: [The double-hold race and unique constraints](07-the-double-hold-race-and-unique-constraints).

<EvidenceCard
  command="uv run pytest tests/unit/inventory -q"
  artifact="inventory.py with place_hold and a fake; PostgresInventory; two inventory routes; four problem handlers"
  invariant="A hold is a committed row referencing a real stock item, with an expiry the clock decides"
/>
