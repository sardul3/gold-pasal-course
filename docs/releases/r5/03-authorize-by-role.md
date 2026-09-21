---
id: r5-03
title: "Authorize by role"
release: r5
order: 3
prerequisites: [r5-02]
outcomes:
  - Write require_staff and require_customer dependencies that raise ForbiddenError
  - Protect stock and catalog writes for staff and holds for customers, leaving reads public
  - Return a 403 problem with type ending /forbidden
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="A customer with a valid token can POST /api/inventory/items and invent a necklace. Knowing who someone is says nothing about what they may do."
  destination="Staff seed stock and catalog items. Customers place holds. Everyone reads. The wrong role gets 403 /forbidden; no token still gets 401."
/>

# Authorize by role

**Authorization** answers "may this caller do this". It comes after authentication and depends on it: you cannot decide what an unknown caller may do. This shop has two roles and a short table of who may do what. The table becomes two dependencies, and every write route names the one it needs.

## See the idea first

The rule, before the code:

| Route | staff | customer | no token |
| --- | --- | --- | --- |
| `GET /health`, `GET /api/catalog/items...` | yes | yes | yes |
| `POST /api/catalog/items` | yes | 403 | 401 |
| `POST /api/inventory/items` | yes | 403 | 401 |
| `POST /api/inventory/holds` | 403 | yes | 401 |
| `GET /api/inventory/holds/{id}` | yes | yes | 401 |

Reads of the catalog stay public: a shopper browses before they identify themselves. Writes are split by who does them in the store: staff put pieces on the tray; customers claim them.

## Role dependencies

Append to `src/gold_pasal/api/auth.py`:

```python
from gold_pasal.errors import ForbiddenError, UnauthorizedError


def require_staff(principal: Caller) -> Principal:
    if principal.role is not Role.STAFF:
        raise ForbiddenError(principal.role.value, "change stock or the catalog")
    return principal


def require_customer(principal: Caller) -> Principal:
    if principal.role is not Role.CUSTOMER:
        raise ForbiddenError(principal.role.value, "hold or buy as a customer")
    return principal


Staff = Annotated[Principal, Depends(require_staff)]
Customer = Annotated[Principal, Depends(require_customer)]
```

Each one depends on `Caller`, so authentication runs first and a missing token is a 401 before any role check. Then a one-line rule. `ForbiddenError` carries the role and the action so the message reads `role 'customer' may not change stock or the catalog`.

Add the handler in `register_problem_handlers`:

```python
    @app.exception_handler(ForbiddenError)
    async def forbidden(_: Request, exc: ForbiddenError) -> JSONResponse:
        return problem_response(slug="forbidden", title="Forbidden", status=403, detail=str(exc))
```

`403 Forbidden` means "I know who you are and the answer is no". No `WWW-Authenticate` header: a different token of the same role would not help. `/forbidden` is the `type` suffix the course's R5 check reads.

## Protect the routes

In `src/gold_pasal/api/inventory.py`:

```python
from gold_pasal.api.auth import Caller, Customer, Staff


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=StockItemRead)
def create_stock_item(body: StockItemCreate, staff: Staff, inventory: Inventory) -> StockItemRead:
    ...


@router.post("/holds", status_code=status.HTTP_201_CREATED, response_model=HoldRead)
def create_hold(body: HoldCreate, customer: Customer, inventory: Inventory, now: Now) -> HoldRead:
    ...


@router.get("/holds/{hold_id}", response_model=HoldRead)
def read_hold(hold_id: str, _: Caller, inventory: Inventory) -> HoldRead:
    ...
```

In `src/gold_pasal/api/catalog.py`, only the create route:

```python
from gold_pasal.api.auth import Staff


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=ItemRead)
def create_item(body: ItemCreate, _: Staff, catalog: Catalog) -> ItemRead:
    ...
```

`staff: Staff` and `customer: Customer` are named because the [audit page](08-audit-events) records `staff.name`. `_: Staff` on the catalog route only enforces; nothing reads it.

The list and read routes on the catalog have no auth parameter at all. Adding one later is one word.

## Try it

Uvicorn running, tokens in `.env`:

```bash
STAFF=$(grep STAFF .env | cut -d= -f2); CUSTOMER=$(grep CUSTOMER .env | cut -d= -f2)
BODY='{"stock_item_id":"GP-B-DEMO","sku":"GP-BANGLE-DEMO"}'

curl -s -i -X POST http://127.0.0.1:8000/api/inventory/items -H "content-type: application/json" -d "$BODY" | head -1
curl -s -X POST http://127.0.0.1:8000/api/inventory/items -H "Authorization: Bearer $CUSTOMER" -H "content-type: application/json" -d "$BODY"
curl -s -X POST http://127.0.0.1:8000/api/inventory/items -H "Authorization: Bearer $STAFF" -H "content-type: application/json" -d "$BODY"
```

```text
HTTP/1.1 401 Unauthorized
{"type":"https://gold-pasal.example/problems/forbidden","title":"Forbidden","status":403,"detail":"role 'customer' may not change stock or the catalog"}
{"stock_item_id":"GP-B-DEMO","sku":"GP-BANGLE-DEMO"}
```

Three requests, three answers, one route. Now the other direction:

```bash
curl -s -X POST http://127.0.0.1:8000/api/inventory/holds -H "Authorization: Bearer $STAFF" -H "content-type: application/json" -d '{"stock_item_id":"GP-B-DEMO","ttl_seconds":900}'
```

```text
{"type":"https://gold-pasal.example/problems/forbidden","title":"Forbidden","status":403,"detail":"role 'staff' may not hold or buy as a customer"}
```

Staff do not reserve pieces for themselves through the customer path. If the store later wants a "hold for walk-in" staff action, that is a new route with its own rule, not a loophole in this one.

## Tests

Replace `tests/http/test_auth.py`:

```python
from fastapi.testclient import TestClient

NECKLACE = {"stock_item_id": "GP-N-0001", "sku": "GP-NECKLACE-0001"}


def test_missing_token_is_a_401_problem_with_a_challenge(client: TestClient) -> None:
    response = client.post("/api/inventory/items", json=NECKLACE)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["type"].endswith("/unauthorized")


def test_wrong_token_is_also_401(client: TestClient) -> None:
    response = client.post(
        "/api/inventory/items", json=NECKLACE, headers={"Authorization": "Bearer nope"}
    )

    assert response.status_code == 401


def test_customer_may_not_seed_stock(client: TestClient, customer: dict[str, str]) -> None:
    response = client.post("/api/inventory/items", json=NECKLACE, headers=customer)

    assert response.status_code == 403
    assert response.json()["type"].endswith("/forbidden")


def test_staff_may_not_place_a_customer_hold(client: TestClient, staff: dict[str, str]) -> None:
    client.post("/api/inventory/items", json=NECKLACE, headers=staff)

    response = client.post(
        "/api/inventory/holds",
        json={"stock_item_id": "GP-N-0001", "ttl_seconds": 900},
        headers=staff,
    )

    assert response.status_code == 403


def test_catalog_reads_stay_public(client: TestClient) -> None:
    assert client.get("/api/catalog/items").status_code == 200
```

The existing catalog tests POST items; they now need the staff header. In `tests/http/test_catalog_api.py`, add `staff: dict[str, str]` to each test that posts and pass `headers=staff`. The inventory integration tests in `tests/inventory` need the same: build the app with a `Settings(...)` carrying test tokens in the `client` fixture, and send `STAFF`/`CUSTOMER` headers from module constants. The [gate](09-release-gate-replay-safe-checkout) shows the finished fixture.

```bash
uv run pytest tests/http -q
```

Green, with five auth tests and every write carrying a token.

## Where the rule lives

The role table at the top of the page is expressed in exactly two places: the two `require_*` functions, and the parameter each route declares. There is no `if role == "staff"` inside a handler. When the rule changes (a third role, a staff-only hold), you add a dependency or change a parameter, and the route's signature documents its own access rule. `/docs` shows a lock icon on every protected route, generated from the same declarations.

::: warning Authorization is not a JSON field
A body that says `{"role": "staff"}` proves nothing. Roles come from the token, which comes from a secret only staff have. Never read a role, a customer id, or a price from the request body when the server can determine it.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `401` where you expected `403` | No token sent, or wrong token | Both are "unknown caller"; send the right header |
| `403` for staff on `/items` | Tokens swapped in `.env` | Check which value is `GOLD_PASAL_STAFF_TOKEN` |
| Catalog tests fail with 401 | POSTs now need staff | Pass `headers=staff` in those tests |
| `ForbiddenError` reaches the client as 500 | Handler not registered | Add it in `register_problem_handlers` |
| `/docs` shows no lock icon | Route has no auth parameter | Add `Staff`, `Customer`, or `Caller` |

## Practice

<LessonQuiz
  question="A customer token POSTs /api/inventory/items. Which dependency raises, and what does the client see?"
  a="current_principal raises UnauthorizedError; 401"
  b="require_staff raises ForbiddenError; 403 with type ending /forbidden"
  c="Neither; the route checks the body's role field"
  d="HTTPBearer raises; 403 with detail Not authenticated"
  correct="b"
>

The token is valid, so authentication succeeds and yields a customer principal. `require_staff` sees the wrong role and raises `ForbiddenError`, mapped to the 403 problem. 401 is for callers the API cannot identify at all.

</LessonQuiz>

Next: [Model the order state machine](04-model-the-order-state-machine), pure Python before the checkout route.

<EvidenceCard
  command="uv run pytest tests/http -q"
  artifact="require_staff and require_customer; Staff on stock and catalog writes, Customer on holds; 403 /forbidden problem"
  invariant="Who may write is declared in each route's signature and derived from the token, never from the body"
/>
