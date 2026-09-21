---
id: r5-07
title: "Payment behind a port"
release: r5
order: 7
prerequisites: [r5-06]
outcomes:
  - Define a PaymentGateway Protocol and a stub adapter that can decline
  - Authorize inside checkout and transition the order to paid
  - Return a 402 problem on decline and prove the hold is still active afterwards
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="Orders are created pending_payment and nothing ever pays them. The real provider is not chosen, and the shop must never see a card number. Whatever is chosen later, a declined payment must leave the necklace on hold, not sold."
  destination="checkout asks a PaymentGateway to authorize a reference; success moves the order to paid, decline is a 402 problem, and the transaction rolls back so the hold stays active."
/>

# Payment behind a port

The shop does not process cards. A **payment provider** does, on its own pages, and hands the tablet a **payment reference** for a payment it has authorized. The API receives that reference and asks the provider to confirm it. Which provider is a decision for later; the **port** is the decision the code needs now. This page writes the port, a stub adapter, and the checkout step that uses it.

## See the idea first

Two references, two outcomes, from `uv run python`:

```python
>>> class StubPaymentGateway:
...     def authorize(self, reference: str):
...         return not reference.startswith("decline-")
...
>>> gateway = StubPaymentGateway()
>>> gateway.authorize("stub-0001"), gateway.authorize("decline-0001")
(True, False)
```

A stub that says yes to everything is useless for testing the failure path. This one has a switch: references that start with `decline-` are declined. Tests and demos flip it by choosing the string.

## The port

Add to `src/gold_pasal/orders.py`:

```python
@dataclass(frozen=True)
class PaymentReceipt:
    reference: str
    authorized: bool


class PaymentGateway(Protocol):
    def authorize(self, reference: str) -> PaymentReceipt: ...


class StubPaymentGateway:
    """Authorizes everything except references that start with 'decline-'."""

    def authorize(self, reference: str) -> PaymentReceipt:
        return PaymentReceipt(reference=reference, authorized=not reference.startswith("decline-"))
```

And the exception in `errors.py`:

```python
class PaymentDeclinedError(OrderError):
    def __init__(self, reference: str) -> None:
        super().__init__(f"payment {reference!r} was declined")
        self.reference = reference
```

`PaymentGateway` has one method and no knowledge of cards, amounts, or HTTP. A real adapter (`StripeGateway`, `EsewaGateway`) will call a provider's API inside `authorize`, map its response to a `PaymentReceipt`, and raise on network failure. `checkout` will not change.

### What is deliberately absent

No card number, expiry, or CVV anywhere in this repository. The tablet talks to the provider; the provider talks to the bank; the API sees a reference string. That is the boundary that keeps the shop out of card-data compliance scope. Do not add a `card_number` field to `OrderCreate`, ever, to "make the demo realistic".

No amount either. The order records what was sold; the reference identifies the payment the provider holds. Reconciling amount against the quote arrives with the quote id in a later release.

## Authorize inside checkout

Update `checkout` in `src/gold_pasal/orders.py` to take the gateway and use the state machine:

```python
from gold_pasal.errors import PaymentDeclinedError


def checkout(
    inventory: InventoryRepository,
    orders: OrdersRepository,
    payments: PaymentGateway,
    *,
    hold_id: str,
    customer: str,
    payment_reference: str,
    idempotency_key: str,
    now: Clock = utc_now,
) -> CheckoutResult:
    """Consume an active hold and create a paid order, once per Idempotency-Key."""
    request_fingerprint = fingerprint(customer, hold_id, payment_reference)
    replay = orders.find_replay(idempotency_key)
    if replay is not None:
        if replay.fingerprint != request_fingerprint:
            raise IdempotencyKeyReuseError(idempotency_key)
        return CheckoutResult(order=orders.get(replay.order_id), replayed=True)

    moment = now()
    hold = inventory.consume_hold(hold_id, now=moment)
    stock_item = inventory.get_stock_item(hold.stock_item_id)
    receipt = payments.authorize(payment_reference)
    if not receipt.authorized:
        raise PaymentDeclinedError(payment_reference)

    order = Order(
        order_id=f"order-{uuid4().hex[:12]}",
        hold_id=hold.hold_id,
        stock_item_id=stock_item.stock_item_id,
        sku=stock_item.sku,
        customer=customer,
        payment_reference=receipt.reference,
        status=OrderStatus.PENDING_PAYMENT,
        created_at=moment,
    )
    order = transition(order, OrderStatus.PAID)
    orders.add(order)
    orders.remember(
        IdempotencyRecord(
            key=idempotency_key, fingerprint=request_fingerprint, order_id=order.order_id
        )
    )
    logger.info("order created order_id=%s sku=%s customer=%s", order.order_id, order.sku, customer)
    return CheckoutResult(order=order, replayed=False)
```

### The order of operations

1. Replay check. A retry never reaches the provider twice.
2. Consume the hold. Takes the row lock, so a concurrent checkout of the same hold waits here.
3. Authorize. If declined, raise. Nothing has been committed: the consumed hold is inside the open transaction and will be rolled back by `get_session`.
4. Build the order, `transition` it to `PAID`, save it, remember the key.

Consume before authorize, not after: if authorization happened first and the hold turned out to be consumed by a racing request, the shop would have taken a payment for nothing. Locking the hold first, then authorizing, means a declined payment costs a rollback and an authorized payment is always matched with a hold that is now yours.

The order is born `PENDING_PAYMENT` and moved to `PAID` through `transition` even though both happen in the same function. The state machine is the only door; if a future rule says paid orders need a receipt number, `transition` is where it goes.

## Wire the gateway

Add a dependency in `src/gold_pasal/api/dependencies.py`:

```python
from gold_pasal.orders import OrdersRepository, PaymentGateway


def get_payments(request: Request) -> PaymentGateway:
    payments: PaymentGateway = request.app.state.payments
    return payments
```

The gateway is per process, not per request: it does not use the database session. In `create_app`, add `payments: PaymentGateway | None = None` and `app.state.payments = payments if payments is not None else StubPaymentGateway()`. In `api/orders.py`, ask for it and pass it:

```python
Payments = Annotated[PaymentGateway, Depends(get_payments)]


def create_order(
    body: OrderCreate,
    idempotency_key: IdempotencyKey,
    customer: Customer,
    inventory: Inventory,
    orders: Orders,
    payments: Payments,
    now: Now,
    response: Response,
) -> OrderRead:
    result = checkout(
        inventory,
        orders,
        payments,
        ...
    )
```

The handler:

```python
    @app.exception_handler(PaymentDeclinedError)
    async def payment_declined(_: Request, exc: PaymentDeclinedError) -> JSONResponse:
        return problem_response(
            slug="payment-declined", title="Payment declined", status=402, detail=str(exc)
        )
```

`402 Payment Required` is the status code HTTP reserved for this and almost nobody uses. It is exactly right here.

## Try a decline

With a fresh hold in `$HOLD`:

```bash
curl -s -i -X POST http://127.0.0.1:8000/api/orders \
  -H "Authorization: Bearer $CUSTOMER" -H "Idempotency-Key: checkout-declined-01" \
  -H "content-type: application/json" \
  -d "{\"hold_id\":\"$HOLD\",\"payment_reference\":\"decline-0001\"}" | sed -n '1p;$p'
curl -s "http://127.0.0.1:8000/api/inventory/holds/$HOLD" -H "Authorization: Bearer $CUSTOMER"
```

```text
HTTP/1.1 402 Payment Required
{"type":"https://gold-pasal.example/problems/payment-declined","title":"Payment declined","status":402,"detail":"payment 'decline-0001' was declined"}
{"hold_id":"...","stock_item_id":"...","status":"active","expires_at":"..."}
```

The hold is `active`. `consume_hold` set it to `consumed` inside the transaction, `PaymentDeclinedError` escaped the route, `get_session` rolled back, and the change never reached the table. The customer can try another card with a new key. A checkout with `stub-0001` on the same hold now returns `"status":"paid"`.

## Tests

Unit, on the fakes, in `tests/unit/orders/test_checkout_service.py` (update `buy` to pass `StubPaymentGateway()`):

```python
from gold_pasal.errors import PaymentDeclinedError
from gold_pasal.orders import InMemoryOrders, OrderStatus, StubPaymentGateway, checkout


def test_checkout_consumes_the_hold_and_pays_the_order(
    inventory: InMemoryInventory, hold_id: str
) -> None:
    orders = InMemoryOrders()

    result = buy(inventory, orders, hold_id, "checkout-0001", "stub-0001")

    assert result.replayed is False
    assert result.order.status is OrderStatus.PAID
    assert inventory.get_hold(hold_id).status is HoldStatus.CONSUMED


def test_a_declined_payment_creates_no_order(inventory: InMemoryInventory, hold_id: str) -> None:
    orders = InMemoryOrders()

    with pytest.raises(PaymentDeclinedError):
        buy(inventory, orders, hold_id, "checkout-0001", "decline-0001")

    assert orders.find_replay("checkout-0001") is None
```

On the fake, the hold stays consumed after a decline, because the fake has no transaction to roll back. That is a real difference between the two adapters, and the reason the rollback is tested against PostgreSQL. Add to `tests/inventory/test_checkout_db.py` (the [gate](09-release-gate-replay-safe-checkout) has the full file):

```python
def test_declined_payment_rolls_back_the_hold_consumption(client: TestClient, engine: Engine) -> None:
    client.post("/api/inventory/items", json=NECKLACE, headers=STAFF)
    hold_id = client.post(
        "/api/inventory/holds", json={"stock_item_id": "GP-N-0001", "ttl_seconds": 900}, headers=CUSTOMER
    ).json()["hold_id"]

    response = client.post(
        "/api/orders",
        json={"hold_id": hold_id, "payment_reference": "decline-0001"},
        headers={**CUSTOMER, "Idempotency-Key": "checkout-db-declined"},
    )

    assert response.status_code == 402
    with engine.connect() as connection:
        assert connection.execute(text("SELECT status FROM holds")).scalar() == "active"
        assert connection.execute(text("SELECT count(*) FROM orders")).scalar() == 0
```

The test reads the tables directly after the request. `active` and zero orders: the rollback is real.

An HTTP test in `tests/http/test_orders_api.py` covers the status code on the in-memory app:

```python
def test_declined_payment_is_a_402_problem(
    client: TestClient, staff: dict[str, str], customer: dict[str, str]
) -> None:
    hold_id = held_necklace(client, staff, customer)

    response = client.post(
        "/api/orders",
        json={"hold_id": hold_id, "payment_reference": "decline-0001"},
        headers={**customer, "Idempotency-Key": "checkout-declined"},
    )

    assert response.status_code == 402
    assert response.json()["type"].endswith("/payment-declined")
```

::: tip Swapping the adapter
A test that needs a gateway that always declines, or one that records calls, passes `create_app(payments=...)`. R2's `FakeMakingCharge` idea, one more time. The stub's `decline-` prefix covers the course; a dedicated `AlwaysDeclines` class is two lines when you need it.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Order is `pending_payment` after a good checkout | `transition(order, OrderStatus.PAID)` missing | Add it after authorize |
| Hold stays `consumed` after a 402 on PostgreSQL | Exception caught inside the route | Let `PaymentDeclinedError` propagate; `get_session` rolls back |
| `500` on decline | Handler not registered | Add the `PaymentDeclinedError` handler |
| Replay reaches the provider | Replay check after `authorize` | Check `find_replay` first |
| pyright: `checkout() missing argument "payments"` | Call sites not updated | Pass `StubPaymentGateway()` in tests, `payments` in the route |

## Practice

<LessonQuiz
  question="Payment is declined for a hold that checkout had just marked consumed. What is the hold's status in the database after the response?"
  a="consumed; the flush already ran"
  b="active; the exception rolled back the whole transaction"
  c="expired"
  d="It depends on the provider"
  correct="b"
>

`consume_hold` flushed an UPDATE inside the open transaction. `PaymentDeclinedError` left the route, `get_session` called `rollback()`, and the UPDATE was discarded. One transaction per request means a declined payment cannot half-sell a necklace.

</LessonQuiz>

Next: [Audit events](08-audit-events).

<EvidenceCard
  command="uv run pytest tests/unit/orders tests/http/test_orders_api.py -q"
  artifact="PaymentGateway Protocol, StubPaymentGateway, PaymentDeclinedError mapped to 402, order transitioned to paid"
  invariant="A declined payment rolls back the hold consumption; a paid order always has an authorized reference"
/>
