---
id: r5-06
title: "Idempotency keys"
release: r5
order: 6
prerequisites: [r5-05]
outcomes:
  - Require an Idempotency-Key header on POST /api/orders
  - Store key, request fingerprint, and order_id in the same transaction as the order
  - Return the original order with 200 on replay and reject a reused key with a different body
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="The customer taps Buy. The network drops before the response arrives. The tablet retries. Today the second request is a 409 hold-not-active and the customer cannot tell whether she bought the necklace."
  destination="A retried checkout with the same Idempotency-Key returns the original order with 200. The same key with a different body is a 422. Two orders from one tap cannot happen."
/>

# Idempotency keys

An operation is **idempotent** when doing it twice has the same effect as doing it once. `GET` is idempotent by nature. `POST /api/orders` is not: each call creates an order. An **idempotency key** is a client-chosen id for one attempt; the server remembers what it did for that key and replays the answer instead of doing it again. Payment providers work this way, and now so does checkout.

## See the idea first

The contract, in requests:

```text
POST /api/orders  Idempotency-Key: checkout-0001  {hold_id: H, payment_reference: P}   -> 201, order O
POST /api/orders  Idempotency-Key: checkout-0001  {hold_id: H, payment_reference: P}   -> 200, order O   (same body)
POST /api/orders  Idempotency-Key: checkout-0001  {hold_id: H, payment_reference: Q}   -> 422            (same key, different body)
POST /api/orders  Idempotency-Key: checkout-0002  {hold_id: H, payment_reference: P}   -> 409            (new key, hold consumed)
```

The first two lines are the retry story. The third stops a client from reusing a key by accident. The fourth is the previous page, unchanged: a new attempt on a consumed hold is a real conflict.

## Remember what was done

The record to keep per key: the key, a **fingerprint** of the request (so a different body with the same key is detectable), and the order it produced. Add to `src/gold_pasal/orders.py`:

```python
import hashlib

from gold_pasal.errors import IdempotencyKeyReuseError


@dataclass(frozen=True)
class IdempotencyRecord:
    key: str
    fingerprint: str
    order_id: str


class OrdersRepository(Protocol):
    def add(self, order: Order) -> None: ...

    def get(self, order_id: str) -> Order: ...

    def find_replay(self, key: str) -> IdempotencyRecord | None: ...

    def remember(self, record: IdempotencyRecord) -> None: ...


def fingerprint(*parts: str) -> str:
    """A stable hash of the request, so a reused key with a different body is caught."""
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


@dataclass(frozen=True)
class CheckoutResult:
    order: Order
    replayed: bool
```

And the exception in `errors.py`:

```python
class IdempotencyKeyReuseError(OrderError):
    def __init__(self, key: str) -> None:
        super().__init__(f"Idempotency-Key {key!r} was already used with a different request")
```

`fingerprint("customer", "hold-1", "stub")` is a 64-character hex string; change one character of any input and it is a different string. The record stores the hash, not the body, so it is small and holds nothing sensitive.

The fake gains a dict:

```python
class InMemoryOrders:
    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}
        self._keys: dict[str, IdempotencyRecord] = {}

    ...

    def find_replay(self, key: str) -> IdempotencyRecord | None:
        return self._keys.get(key)

    def remember(self, record: IdempotencyRecord) -> None:
        self._keys[record.key] = record
```

## The service, with replay

Change `checkout` to take the key and return a `CheckoutResult`:

```python
def checkout(
    inventory: InventoryRepository,
    orders: OrdersRepository,
    *,
    hold_id: str,
    customer: str,
    payment_reference: str,
    idempotency_key: str,
    now: Clock = utc_now,
) -> CheckoutResult:
    """Consume an active hold and create an order, once per Idempotency-Key."""
    request_fingerprint = fingerprint(customer, hold_id, payment_reference)
    replay = orders.find_replay(idempotency_key)
    if replay is not None:
        if replay.fingerprint != request_fingerprint:
            raise IdempotencyKeyReuseError(idempotency_key)
        return CheckoutResult(order=orders.get(replay.order_id), replayed=True)

    moment = now()
    hold = inventory.consume_hold(hold_id, now=moment)
    stock_item = inventory.get_stock_item(hold.stock_item_id)
    order = Order(...)          # unchanged from the previous page
    orders.add(order)
    orders.remember(
        IdempotencyRecord(
            key=idempotency_key, fingerprint=request_fingerprint, order_id=order.order_id
        )
    )
    logger.info("order created order_id=%s sku=%s customer=%s", order.order_id, order.sku, customer)
    return CheckoutResult(order=order, replayed=False)
```

Walk a replay. The fingerprint of the incoming request is computed. `find_replay` finds the record from the first attempt. The fingerprints match, so the stored order is loaded and returned with `replayed=True`; nothing is consumed, nothing is added. Walk a reuse: same key, different `payment_reference`, different fingerprint, `IdempotencyKeyReuseError`. Walk a first attempt: no record, so the hold is consumed, the order added, and the record remembered, all before the transaction commits.

The fingerprint includes `customer`, so a key leaked from one customer cannot replay another customer's order.

## The table

Add to `src/gold_pasal/orm.py`:

```python
class IdempotencyKeyRow(Base):
    __tablename__ = "idempotency_keys"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.order_id"))
```

`key` is the primary key, so two first-attempts racing with the same key cannot both insert a record; the loser gets `IntegrityError` and the transaction rolls back, including its order. That is the same "let the database be the referee" move as R4.

The adapter methods in `PostgresOrders`:

```python
    def find_replay(self, key: str) -> IdempotencyRecord | None:
        row = self._session.get(IdempotencyKeyRow, key)
        if row is None:
            return None
        return IdempotencyRecord(key=row.key, fingerprint=row.fingerprint, order_id=row.order_id)

    def remember(self, record: IdempotencyRecord) -> None:
        self._session.add(
            IdempotencyKeyRow(
                key=record.key, fingerprint=record.fingerprint, order_id=record.order_id
            )
        )
        self._session.flush()
```

Then a revision:

```bash
uv run alembic revision --autogenerate -m "idempotency keys"
uv run ruff check --fix alembic && uv run ruff format alembic
uv run alembic upgrade head
```

## The header

In `src/gold_pasal/api/orders.py`, read the header and set the replay status:

```python
from fastapi import APIRouter, Depends, Header, Response, status

IdempotencyKey = Annotated[str, Header(min_length=8, max_length=80, alias="Idempotency-Key")]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=OrderRead)
def create_order(
    body: OrderCreate,
    idempotency_key: IdempotencyKey,
    customer: Customer,
    inventory: Inventory,
    orders: Orders,
    now: Now,
    response: Response,
) -> OrderRead:
    result = checkout(
        inventory,
        orders,
        hold_id=body.hold_id,
        customer=customer.name,
        payment_reference=body.payment_reference,
        idempotency_key=idempotency_key,
        now=now,
    )
    if result.replayed:
        response.status_code = status.HTTP_200_OK
    return _order_read(result.order)
```

`Header(...)` reads a request header the way `Query(...)` reads a query parameter. `alias="Idempotency-Key"` maps the HTTP name to the Python name. It has no default, so a request without the header is a 422 problem from the `RequestValidationError` handler, with `detail` `header.Idempotency-Key: Field required`. `min_length=8` rejects keys too short to be unique in practice.

`response: Response` is FastAPI's way to let a handler change the status code of an otherwise normal return: `201` for a new order, `200` for a replay. Same body shape either way.

Add the handler for the reuse case:

```python
    @app.exception_handler(IdempotencyKeyReuseError)
    async def idempotency_reuse(_: Request, exc: IdempotencyKeyReuseError) -> JSONResponse:
        return problem_response(
            slug="idempotency-key-reuse",
            title="Idempotency key reused",
            status=422,
            detail=str(exc),
        )
```

## Try the four lines

With a fresh hold in `$HOLD`:

```bash
for n in 1 2; do
  curl -s -i -X POST http://127.0.0.1:8000/api/orders \
    -H "Authorization: Bearer $CUSTOMER" -H "Idempotency-Key: checkout-demo-0001" \
    -H "content-type: application/json" \
    -d "{\"hold_id\":\"$HOLD\",\"payment_reference\":\"stub-demo\"}" | sed -n '1p;$p'; echo
done
```

```text
HTTP/1.1 201 Created
{"order_id":"order-f3313c62d70f","hold_id":"hold-e79e2db3aea9",...,"status":"pending_payment",...}
HTTP/1.1 200 OK
{"order_id":"order-f3313c62d70f","hold_id":"hold-e79e2db3aea9",...,"status":"pending_payment",...}
```

Same `order_id`, `201` then `200`. The course's R5 check does exactly this and compares the two ids. Then the reuse and the missing header:

```bash
curl -s -X POST http://127.0.0.1:8000/api/orders -H "Authorization: Bearer $CUSTOMER" -H "Idempotency-Key: checkout-demo-0001" -H "content-type: application/json" -d "{\"hold_id\":\"$HOLD\",\"payment_reference\":\"other\"}"
curl -s -X POST http://127.0.0.1:8000/api/orders -H "Authorization: Bearer $CUSTOMER" -H "content-type: application/json" -d "{\"hold_id\":\"$HOLD\",\"payment_reference\":\"stub-demo\"}"
```

```text
{"type":"https://gold-pasal.example/problems/idempotency-key-reuse","title":"Idempotency key reused","status":422,"detail":"Idempotency-Key 'checkout-demo-0001' was already used with a different request"}
{"type":"https://gold-pasal.example/problems/invalid-request","title":"Invalid request","status":422,"detail":"header.Idempotency-Key: Field required"}
```

## Tests

Extend `tests/unit/orders/test_checkout_service.py` with a helper that passes a key, and three cases:

```python
from gold_pasal.errors import HoldNotActiveError, IdempotencyKeyReuseError


def buy(inventory: InMemoryInventory, orders: InMemoryOrders, hold_id: str, key: str, ref: str):
    return checkout(
        inventory,
        orders,
        hold_id=hold_id,
        customer="customer",
        payment_reference=ref,
        idempotency_key=key,
        now=now,
    )


def test_replay_returns_the_same_order_without_a_second_consume(
    inventory: InMemoryInventory, hold_id: str
) -> None:
    orders = InMemoryOrders()
    first = buy(inventory, orders, hold_id, "checkout-0001", "stub-0001")

    replay = buy(inventory, orders, hold_id, "checkout-0001", "stub-0001")

    assert replay.replayed is True
    assert replay.order == first.order


def test_reusing_a_key_for_a_different_request_is_rejected(
    inventory: InMemoryInventory, hold_id: str
) -> None:
    orders = InMemoryOrders()
    buy(inventory, orders, hold_id, "checkout-0001", "stub-0001")

    with pytest.raises(IdempotencyKeyReuseError):
        buy(inventory, orders, hold_id, "checkout-0001", "stub-0002")


def test_a_consumed_hold_cannot_be_bought_again(inventory: InMemoryInventory, hold_id: str) -> None:
    orders = InMemoryOrders()
    buy(inventory, orders, hold_id, "checkout-0001", "stub-0001")

    with pytest.raises(HoldNotActiveError, match="consumed"):
        buy(inventory, orders, hold_id, "checkout-0002", "stub-0001")
```

And HTTP tests in `tests/http/test_orders_api.py` (the name avoids clashing with the unit file):

```python
from fastapi.testclient import TestClient

NECKLACE = {"stock_item_id": "GP-N-0001", "sku": "GP-NECKLACE-0001"}
HOLD = {"stock_item_id": "GP-N-0001", "ttl_seconds": 900}


def held_necklace(client: TestClient, staff: dict[str, str], customer: dict[str, str]) -> str:
    client.post("/api/inventory/items", json=NECKLACE, headers=staff)
    held = client.post("/api/inventory/holds", json=HOLD, headers=customer)
    assert held.status_code == 201, held.text
    return held.json()["hold_id"]


def test_replaying_the_same_key_returns_the_same_order(
    client: TestClient, staff: dict[str, str], customer: dict[str, str]
) -> None:
    hold_id = held_necklace(client, staff, customer)
    body = {"hold_id": hold_id, "payment_reference": "stub-0001"}
    headers = {**customer, "Idempotency-Key": "checkout-0001"}

    first = client.post("/api/orders", json=body, headers=headers)
    replay = client.post("/api/orders", json=body, headers=headers)

    assert (first.status_code, replay.status_code) == (201, 200)
    assert replay.json()["order_id"] == first.json()["order_id"]


def test_same_key_with_a_different_body_is_rejected(
    client: TestClient, staff: dict[str, str], customer: dict[str, str]
) -> None:
    hold_id = held_necklace(client, staff, customer)
    headers = {**customer, "Idempotency-Key": "checkout-0001"}
    client.post("/api/orders", json={"hold_id": hold_id, "payment_reference": "stub-1"}, headers=headers)

    response = client.post(
        "/api/orders", json={"hold_id": hold_id, "payment_reference": "stub-2"}, headers=headers
    )

    assert response.status_code == 422
    assert response.json()["type"].endswith("/idempotency-key-reuse")


def test_missing_idempotency_key_is_a_422_problem(
    client: TestClient, staff: dict[str, str], customer: dict[str, str]
) -> None:
    hold_id = held_necklace(client, staff, customer)

    response = client.post(
        "/api/orders", json={"hold_id": hold_id, "payment_reference": "stub-1"}, headers=customer
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "header.Idempotency-Key: Field required"
```

```bash
uv run pytest tests/unit/orders tests/http/test_orders_api.py -q
```

Green.

::: tip Who chooses the key
The client, once per user action, before the first attempt: a UUID generated when the Buy button is tapped, reused for every retry of that tap. A new tap is a new key. The server never generates it; a server-generated key cannot survive a lost response.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Replay returns `201` | `response.status_code` not set on the replay path | `if result.replayed: response.status_code = 200` |
| Replay creates a second order | `remember` not called, or called after a failure | Remember in the same transaction as `orders.add` |
| `422 header.Idempotency-Key: Field required` on a request that sent it | Header shorter than 8 characters, or wrong name | `Idempotency-Key`, 8 to 80 characters |
| `IntegrityError` on `idempotency_keys_pkey` | Two first attempts raced | Expected; the loser rolls back. Map it to a retry-safe 409 if you see it in practice |
| Another customer's key replays my order | Fingerprint omits `customer` | Include the principal's name in `fingerprint` |

## Practice

<LessonQuiz
  question="The tablet sends Idempotency-Key checkout-77 twice with identical bodies; the first response was lost. What does the customer end up with?"
  a="Two orders and one necklace"
  b="One order; the second request returns it with 200"
  c="A 409 hold-not-active on the second request"
  d="A 422 for the second request"
  correct="b"
>

The first attempt consumed the hold, created the order, and remembered the key. The retry finds the record, sees the same fingerprint, and returns the stored order. Line two of the contract at the top of the page.

</LessonQuiz>

Next: [Payment behind a port](07-payment-behind-a-port), which turns `pending_payment` into `paid` and rolls everything back when a card is declined.

<EvidenceCard
  command="uv run pytest tests/http/test_orders_api.py -q"
  artifact="Idempotency-Key header, idempotency_keys table and revision, fingerprint, CheckoutResult with replayed"
  invariant="One Idempotency-Key produces one order no matter how many times the request is sent"
/>
