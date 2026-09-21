---
id: r5-02
title: "Authenticate with bearer tokens"
release: r5
order: 2
prerequisites: [r5-01]
outcomes:
  - Read Authorization: Bearer with FastAPI's HTTPBearer
  - Compare tokens with secrets.compare_digest and produce a Principal
  - Return a 401 problem with a WWW-Authenticate challenge when the token is missing or wrong
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="Anyone who can reach port 8000 can seed inventory. The API has no idea who is calling."
  destination="A request with a valid bearer token resolves to a Principal with a role; anything else is a 401 problem. Nothing is protected yet; that is the next page."
/>

# Authenticate with bearer tokens

**Authentication** answers "who is calling". A **bearer token** is a secret string sent in the `Authorization` header; whoever bears it is treated as its owner, which is why it must be long, random, and kept out of Git. This shop has two tokens, one for staff and one for customers, configured on the previous page. This page turns a header into a `Principal`.

## See the idea first

```bash
curl -s -i http://127.0.0.1:8000/health -H "Authorization: Bearer whatever" | head -1
```

```text
HTTP/1.1 200 OK
```

Right now every header is ignored. By the end of this page the same header can be checked on any route that asks; by the end of the next, the write routes will ask.

## The auth module

Add two exceptions to `src/gold_pasal/errors.py`:

```python
class UnauthorizedError(Exception):
    def __init__(self) -> None:
        super().__init__("a valid bearer token is required")


class ForbiddenError(Exception):
    def __init__(self, role: str, action: str) -> None:
        super().__init__(f"role {role!r} may not {action}")
```

Create `src/gold_pasal/api/auth.py`:

```python
"""Who is calling (authentication) and what they may do (authorization)."""

import secrets
from dataclasses import dataclass
from enum import StrEnum
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import SecretStr

from gold_pasal.errors import UnauthorizedError
from gold_pasal.settings import Settings


class Role(StrEnum):
    STAFF = "staff"
    CUSTOMER = "customer"


@dataclass(frozen=True)
class Principal:
    role: Role

    @property
    def name(self) -> str:
        return self.role.value


bearer = HTTPBearer(auto_error=False)


def _matches(presented: str, expected: SecretStr | None) -> bool:
    return expected is not None and secrets.compare_digest(
        presented.encode(), expected.get_secret_value().encode()
    )


def current_principal(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    if credentials is None:
        raise UnauthorizedError()
    settings: Settings = request.app.state.settings
    if _matches(credentials.credentials, settings.staff_token):
        return Principal(Role.STAFF)
    if _matches(credentials.credentials, settings.customer_token):
        return Principal(Role.CUSTOMER)
    raise UnauthorizedError()


Caller = Annotated[Principal, Depends(current_principal)]
```

### Reading it

`HTTPBearer` is a FastAPI dependency that parses `Authorization: Bearer <token>` into `credentials.credentials`. `auto_error=False` makes it return `None` for a missing or malformed header instead of raising FastAPI's own 403; the shop wants its own 401 problem document.

`current_principal` is the dependency routes will ask for. It reads the two tokens from `Settings` on `app.state`, compares, and returns a `Principal`. A `Principal` is "an authenticated caller": here only a role, later maybe a name or an id. `Caller` is the `Annotated` alias so a route writes `caller: Caller`.

`Role` is a `StrEnum` so `Principal(Role.STAFF).name` is `"staff"`, the string the audit log will store.

### compare_digest

```python
>>> import secrets
>>> secrets.compare_digest(b"a", b"a"), secrets.compare_digest(b"a", b"b")
(True, False)
```

`==` on strings stops at the first differing character, so a wrong token that shares a long prefix takes measurably longer to reject than one that differs immediately. Over many requests that leaks the token one character at a time. `compare_digest` takes the same time regardless. Use it for every secret comparison; it is the one place `get_secret_value()` is called.

### One SecretStr per role

Two shared tokens is the simplest scheme that lets the API tell staff from customers. It is enough for a homelab and for the course's checks. It is not a login system: no users, no expiry, no revocation short of changing the value. R-later releases can put OAuth or signed tokens behind the same `current_principal` seam; routes will not change.

## The 401 problem

Add a handler in `register_problem_handlers` in `src/gold_pasal/api/problems.py`, and let `problem_response` carry headers:

```python
def problem_response(
    *, slug: str, title: str, status: int, detail: str, headers: dict[str, str] | None = None
) -> JSONResponse:
    body = Problem(type=f"{PROBLEM_TYPE_BASE}/{slug}", title=title, status=status, detail=detail)
    return JSONResponse(
        status_code=status,
        content=body.model_dump(),
        media_type=PROBLEM_MEDIA_TYPE,
        headers=headers,
    )


    ...
    @app.exception_handler(UnauthorizedError)
    async def unauthorized(_: Request, exc: UnauthorizedError) -> JSONResponse:
        return problem_response(
            slug="unauthorized",
            title="Unauthorized",
            status=401,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
```

`401 Unauthorized` means "I do not know who you are". The `WWW-Authenticate: Bearer` header is how HTTP tells a client which kind of credential to send; browsers and libraries look for it.

## Try it on one route

Temporarily protect the hold read so you can see both outcomes. In `src/gold_pasal/api/inventory.py`:

```python
from gold_pasal.api.auth import Caller


@router.get("/holds/{hold_id}", response_model=HoldRead)
def read_hold(hold_id: str, _: Caller, inventory: Inventory) -> HoldRead:
    return _hold_read(inventory.get_hold(hold_id))
```

`_: Caller` asks for the dependency and ignores its value: this route only cares that someone valid is calling. Start uvicorn (tokens come from `.env`) and:

```bash
curl -s -i http://127.0.0.1:8000/api/inventory/holds/hold-x | head -1
curl -s -i http://127.0.0.1:8000/api/inventory/holds/hold-x -H "Authorization: Bearer nope" | head -1
curl -s -i http://127.0.0.1:8000/api/inventory/holds/hold-x -H "Authorization: Bearer $(grep CUSTOMER .env | cut -d= -f2)" | head -1
```

```text
HTTP/1.1 401 Unauthorized
HTTP/1.1 401 Unauthorized
HTTP/1.1 404 Not Found
```

No token and a wrong token are both 401. The right token gets past authentication and reaches the route, which says the hold does not exist. The 401 body:

```text
www-authenticate: Bearer
content-type: application/problem+json

{"type":"https://gold-pasal.example/problems/unauthorized","title":"Unauthorized","status":401,"detail":"a valid bearer token is required"}
```

The message does not say which of "missing", "malformed", or "wrong" happened. Telling an attacker they have the format right is a gift.

## Tests

Tests build their own `Settings` so `.env` is never involved. Rewrite `tests/http/conftest.py`:

```python
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from gold_pasal.api.app import create_app
from gold_pasal.settings import Settings

STAFF_TOKEN = "test-staff-token"
CUSTOMER_TOKEN = "test-customer-token"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        staff_token=SecretStr(STAFF_TOKEN),
        customer_token=SecretStr(CUSTOMER_TOKEN),
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings=settings)) as test_client:
        yield test_client


@pytest.fixture
def staff() -> dict[str, str]:
    return {"Authorization": f"Bearer {STAFF_TOKEN}"}


@pytest.fixture
def customer() -> dict[str, str]:
    return {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}
```

Create `tests/http/test_auth.py`:

```python
from fastapi.testclient import TestClient


def test_missing_token_is_a_401_problem_with_a_challenge(client: TestClient) -> None:
    response = client.get("/api/inventory/holds/hold-x")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["type"].endswith("/unauthorized")


def test_wrong_token_is_also_401(client: TestClient) -> None:
    response = client.get(
        "/api/inventory/holds/hold-x", headers={"Authorization": "Bearer nope"}
    )

    assert response.status_code == 401


def test_a_valid_token_reaches_the_route(client: TestClient, customer: dict[str, str]) -> None:
    response = client.get("/api/inventory/holds/hold-x", headers=customer)

    assert response.status_code == 404
```

```bash
uv run pytest tests/http -q
```

Green. The next page moves these tests onto the write routes, where they belong.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `403 {"detail":"Not authenticated"}` | `HTTPBearer()` with `auto_error=True` | `HTTPBearer(auto_error=False)` and raise your own error |
| Right token gives 401 | Token in `.env` differs from what you sent, or `Settings` not on `app.state` | `Settings()` in the REPL; check `app.state.settings` is set in `create_app` |
| `AttributeError: 'State' object has no attribute 'settings'` | `create_app` did not store settings | Assign `app.state.settings` |
| pyright: `"str" is not assignable to "SecretStr"` | Passed a plain string into `Settings(...)` in a test | Wrap with `SecretStr(...)` |
| `TypeError: a bytes-like object is required` | `compare_digest` on str with non-ASCII | Compare `.encode()` on both sides, as in `_matches` |

## Practice

<LessonQuiz
  question="A request arrives with Authorization: Bearer <correct customer token> for a route with a Caller parameter. What does current_principal return?"
  a="Principal(Role.CUSTOMER)"
  b="Principal(Role.STAFF), because staff is checked first"
  c="None; the route decides"
  d="A 403, because customers cannot read holds"
  correct="a"
>

The staff comparison fails, the customer comparison succeeds, and the dependency returns a customer principal. Whether a customer may do what the route does is authorization, the next page; authentication only establishes who is asking.

</LessonQuiz>

Next: [Authorize by role](03-authorize-by-role).

<EvidenceCard
  command="uv run pytest tests/http/test_auth.py -q"
  artifact="api/auth.py with Principal, HTTPBearer, compare_digest; 401 problem with WWW-Authenticate"
  invariant="A caller's identity comes from a secret compared in constant time, never from a field in the body"
/>
