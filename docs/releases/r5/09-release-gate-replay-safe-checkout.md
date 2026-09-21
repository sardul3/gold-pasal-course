---
id: r5-09
title: "Release gate: replay-safe checkout"
release: r5
order: 9
prerequisites: [r5-08]
outcomes:
  - Show one order from two identical POST /api/orders with the same Idempotency-Key
  - Show 403 /forbidden for a customer seeding stock and 401 with no token
  - Run unit, HTTP, and integration suites green with tokens from .env
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="shop operations"
  problem="A reviewer will export two tokens, seed a bangle as staff, hold it as a customer, check out twice with one key, and then try the staff route with the customer token."
  destination="Two POSTs, one order_id. A 403 with type ending /forbidden. Three green test commands. Nothing secret in git status."
/>

# Release gate: replay-safe checkout

A checklist with the final listings the earlier pages built up piece by piece.

## See the idea first

1. Tokens and database in `.env`, and confirm Git does not see the file:

```bash
grep -c TOKEN .env
git status --short | grep -c "^.. .env$" || echo "no .env in git status"
```

```text
2
no .env in git status
```

2. Schema at head:

```bash
uv run --env-file .env alembic upgrade head
uv run --env-file .env alembic current
```

```text
ef5f48605867 (head)
```

Your id differs; what matters is `(head)` and that `\dt` in psql lists `orders`, `idempotency_keys`, and `audit_events`.

3. Start the API (settings come from `.env`):

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000
```

4. In a second terminal, the roles:

```bash
STAFF=$(grep STAFF .env | cut -d= -f2); CUSTOMER=$(grep CUSTOMER .env | cut -d= -f2)
BODY='{"stock_item_id":"GP-B-GATE","sku":"GP-BANGLE-GATE"}'
curl -s -i -X POST http://127.0.0.1:8000/api/inventory/items -H "content-type: application/json" -d "$BODY" | head -1
curl -s -X POST http://127.0.0.1:8000/api/inventory/items -H "Authorization: Bearer $CUSTOMER" -H "content-type: application/json" -d "$BODY"
curl -s -X POST http://127.0.0.1:8000/api/inventory/items -H "Authorization: Bearer $STAFF" -H "content-type: application/json" -d "$BODY"
```

```text
HTTP/1.1 401 Unauthorized
{"type":"https://gold-pasal.example/problems/forbidden","title":"Forbidden","status":403,"detail":"role 'customer' may not change stock or the catalog"}
{"stock_item_id":"GP-B-GATE","sku":"GP-BANGLE-GATE"}
```

5. Hold, then check out twice with one key:

```bash
HOLD=$(curl -s -X POST http://127.0.0.1:8000/api/inventory/holds -H "Authorization: Bearer $CUSTOMER" -H "content-type: application/json" -d '{"stock_item_id":"GP-B-GATE","ttl_seconds":900}' | python3 -c "import json,sys; print(json.load(sys.stdin)['hold_id'])")
for n in 1 2; do
  curl -s -i -X POST http://127.0.0.1:8000/api/orders -H "Authorization: Bearer $CUSTOMER" -H "Idempotency-Key: checkout-gate-0001" -H "content-type: application/json" -d "{\"hold_id\":\"$HOLD\",\"payment_reference\":\"stub-gate\"}" | sed -n '1p;$p'; echo
done
```

```text
HTTP/1.1 201 Created
{"order_id":"order-f3313c62d70f",...,"status":"paid",...}
HTTP/1.1 200 OK
{"order_id":"order-f3313c62d70f",...,"status":"paid",...}
```

Same `order_id`. That pair of lines is the course's R5 check.

6. The audit trail, in psql:

```sql
SELECT actor, action, entity_id FROM audit_events ORDER BY id DESC LIMIT 3;
```

```text
  actor   |       action       |     entity_id
----------+--------------------+--------------------
 customer | order.created      | order-f3313c62d70f
 customer | hold.placed        | hold-e79e2db3aea9
 staff    | stock_item.created | GP-B-GATE
```

7. Stop uvicorn. The suites:

```bash
./scripts/verify.sh
uv run --env-file .env pytest tests/inventory -m integration -q
```

```text
================= 70 passed, 7 deselected, 1 warning in 2.36s ==================
7 passed in 0.76s
```

## The finished files

The release grew `checkout` across four pages. This is the whole function as it stands, in `src/gold_pasal/orders.py`:

```python
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

The integration fixture with tokens, `tests/inventory/conftest.py`:

```python
"""A real PostgreSQL for inventory tests: a test database URL, or a throwaway container."""

import os
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import Engine, text

from gold_pasal.api.app import create_app
from gold_pasal.db import make_engine, make_session_factory
from gold_pasal.settings import Settings


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    configured = os.environ.get("GOLD_PASAL_TEST_DATABASE_URL")
    if configured:
        yield configured
        return
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16", driver="psycopg") as container:
        yield container.get_connection_url()


@pytest.fixture(scope="session")
def migrated_engine(database_url: str) -> Iterator[Engine]:
    os.environ["DATABASE_URL"] = database_url
    command.upgrade(Config("alembic.ini"), "head")
    engine = make_engine(database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def engine(migrated_engine: Engine) -> Engine:
    with migrated_engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE audit_events, idempotency_keys, orders, holds, stock_items, catalog_items"
            )
        )
    return migrated_engine


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    settings = Settings(
        staff_token=SecretStr("test-staff-token"), customer_token=SecretStr("test-customer-token")
    )
    app = create_app(settings=settings, session_factory=make_session_factory(engine))
    with TestClient(app) as test_client:
        yield test_client
```

The R4 integration tests gained two module constants and `headers=STAFF` or `headers=CUSTOMER` on every call:

```python
STAFF = {"Authorization": "Bearer test-staff-token"}
CUSTOMER = {"Authorization": "Bearer test-customer-token"}
```

And `tests/inventory/test_checkout_db.py`, both tests from the payment and audit pages, in one file:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

pytestmark = pytest.mark.integration

STAFF = {"Authorization": "Bearer test-staff-token"}
CUSTOMER = {"Authorization": "Bearer test-customer-token"}
NECKLACE = {"stock_item_id": "GP-N-0001", "sku": "GP-NECKLACE-0001"}


def test_checkout_commits_order_key_and_audit_in_one_transaction(
    client: TestClient, engine: Engine
) -> None:
    client.post("/api/inventory/items", json=NECKLACE, headers=STAFF)
    hold_id = client.post(
        "/api/inventory/holds",
        json={"stock_item_id": "GP-N-0001", "ttl_seconds": 900},
        headers=CUSTOMER,
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
        actions = (
            connection.execute(text("SELECT action FROM audit_events ORDER BY id")).scalars().all()
        )
        hold_status = connection.execute(text("SELECT status FROM holds")).scalar()
    assert (orders, keys) == (1, 1)
    assert actions == ["stock_item.created", "hold.placed", "order.created"]
    assert hold_status == "consumed"


def test_declined_payment_rolls_back_the_hold_consumption(
    client: TestClient, engine: Engine
) -> None:
    client.post("/api/inventory/items", json=NECKLACE, headers=STAFF)
    hold_id = client.post(
        "/api/inventory/holds",
        json={"stock_item_id": "GP-N-0001", "ttl_seconds": 900},
        headers=CUSTOMER,
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

## Where each answer comes from

| Step | Answered by |
| --- | --- |
| tokens absent from Git | `.gitignore` from R0; `Settings` reads `.env` |
| `401` | `HTTPBearer(auto_error=False)`, `current_principal`, the `UnauthorizedError` handler |
| `403 /forbidden` | `require_staff`, the `ForbiddenError` handler |
| `201` then `200`, same id | `find_replay`, `IdempotencyRecord`, `response.status_code` on replay |
| `"status":"paid"` | `StubPaymentGateway.authorize`, `transition(order, PAID)` |
| three audit rows in order | `audit.record` in each write route, same session, autoincrement `id` |
| hold `active` after a decline | `PaymentDeclinedError` through `get_session`'s rollback |

Say out loud: no card data anywhere; two shared tokens, not a login system; the order has no amount yet. Each is a boundary chosen on purpose, and each has the seam where the real thing goes.

## Failure drill

Comment out `response.status_code = status.HTTP_200_OK` in `create_order` and rerun step 5. Both responses say `201` with the same `order_id`. The course's check accepts either code, and the tests do not:

```bash
uv run pytest tests/http/test_orders_api.py -q -x
```

```text
FAILED tests/http/test_orders_api.py::test_replaying_the_same_key_returns_the_same_order
```

Restore the line. A replay that looks like a fresh creation confuses every client that counts orders.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `401` with the right token | `.env` not read; uvicorn started elsewhere | Start from `gold-pasal`, or export the variables |
| Course check says `Set GOLD_PASAL_STAFF_TOKEN` | Variables not exported in the check's shell | `export` both before running it |
| Second POST is `409 hold-not-active` | Different `Idempotency-Key`, or `remember` not called | Same key on both; remember in the transaction |
| Different `order_id` on replay | Fingerprint mismatch path missing, or key not stored | Check `find_replay` and `remember` |
| Audit rows out of order | Sorted by `at` with equal timestamps | Order by `id` |
| Integration tests `401` | Fixture app built without `Settings` tokens | `create_app(settings=Settings(...))` in the `client` fixture |

## Practice

<LessonQuiz
  question="A customer retries checkout with the same Idempotency-Key after a timeout. Which of these happens?"
  a="A second order and a second audit event"
  b="The stored order is returned with 200; no hold change, no payment call, no audit event"
  c="A 409 hold-not-active"
  d="A 401, because tokens are single-use"
  correct="b"
>

The replay path runs before anything else in `checkout`: the key is found, the fingerprint matches, and the stored order comes back. The route sets 200 and skips `audit.record`. Every side effect belonged to the first attempt.

</LessonQuiz>

Next: [R6: Team workflow and production confidence](/releases/r6/). The first three pages are Git: a branch, a pull request, a rebase. Then CI runs `tests/inventory` against PostgreSQL so these seven tests stop being laptop-only. After that, every response carries a request id.

<EvidenceCard
  command="./scripts/verify.sh && uv run --env-file .env pytest tests/inventory -m integration -q"
  artifact="two identical POST /api/orders returning one order_id; 401 and 403 problems; three audit rows; 70 plus 7 tests green"
  invariant="One key, one order; one token, one role; one transaction per request, secrets in .env only"
/>
