---
id: r6-05
title: "Echo X-Request-ID"
release: r6
order: 5
prerequisites: [r6-04]
outcomes:
  - Install HTTP middleware that copies X-Request-ID or creates a UUID
  - Echo the same value as x-request-id on every response
  - Store the id on request.state for later handlers
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="A shopper says checkout failed. Uvicorn printed GET /api/orders 500 and GET /health 200. There is no shared key, so you cannot prove those lines are the same attempt or two different people."
  destination="GET /health with X-Request-ID: acceptance-trace-42 returns x-request-id: acceptance-trace-42. A request with no header still gets an id."
/>

# Echo X-Request-ID

A **request id** is a string that follows one HTTP call through the process: the incoming header, `request.state`, the response header, and (next pages) problem JSON and logs. The course check sends `X-Request-ID: acceptance-trace-42` to `/health` and expects the response header `x-request-id` to equal that value.

**Middleware** is a function FastAPI runs around every route. It sees the request before the handler and the response after. `/health` must not be the only place that sets the header; a 404 and a 500 need it too.

## See the idea first

From `gold-pasal`, on a branch:

```bash
git checkout main
git pull origin main
git checkout -b r6/observability
```

Create `src/gold_pasal/api/observability.py`:

```python
"""Request ids and JSON logs for the HTTP edge."""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response


def install_request_context(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_context(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        incoming = request.headers.get("x-request-id")
        request_id = incoming.strip() if incoming and incoming.strip() else str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response
```

HTTP header names are case-insensitive. Starlette stores them lower-case, so the lookup is `x-request-id` even when the client sent `X-Request-ID`.

If the client sent a non-empty value, reuse it. Load balancers and the course check both do that. If the header is missing or blank, `uuid.uuid4()` creates one so the response still has a key.

`request.state` is a bag Starlette gives you per request. Handlers and exception handlers read `request.state.request_id` on the next page. The middleware writes it before `call_next`, so the handler always sees it.

`await call_next(request)` runs the route (and other middleware). After it returns, you set the outgoing header on that same `response` object. Do not build a new empty response; you would drop the body `/health` already wrote.

## Register it

At the top of `src/gold_pasal/api/app.py`:

```python
from gold_pasal.api.observability import install_request_context
```

Inside `create_app`, immediately after `app = FastAPI(...)`:

```python
    app = FastAPI(title="Gold Pasal", version=__version__)
    install_request_context(app)
```

Keep the rest of `create_app` as it is. Middleware registered here runs for every path, including `/health`, `/ready` once it exists, and `/api/catalog/items/{sku}`.

## Prove it with curl

Start the API from `gold-pasal` (settings still come from `.env`):

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000
```

In a second terminal:

```bash
curl -s -D - -H "X-Request-ID: acceptance-trace-42" http://127.0.0.1:8000/health
```

```text
HTTP/1.1 200 OK
date: Mon, 21 Sep 2026 13:57:08 GMT
server: uvicorn
content-length: 38
content-type: application/json
x-request-id: acceptance-trace-42

{"service":"gold-pasal","status":"ok"}
```

The date line will differ. `x-request-id: acceptance-trace-42` must match. `curl -D -` writes headers to stdout; `-s` hides the progress meter.

Without a header, you still get an id:

```bash
curl -s -D - http://127.0.0.1:8000/health | grep -i x-request-id
```

```text
x-request-id: 2def4f2c-a870-44dc-8ea4-bcc66b1d8b4c
```

Your UUID differs. Length 36 with hyphens is the `uuid4` shape.

## Prove it in TestClient

Create `tests/http/test_observability.py`:

```python
"""Request ids and operational routes."""

from fastapi.testclient import TestClient


def test_health_echoes_request_id(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "acceptance-trace-42"})
    assert response.status_code == 200
    assert response.headers["x-request-id"] == "acceptance-trace-42"


def test_health_generates_request_id_when_missing(client: TestClient) -> None:
    response = client.get("/health")
    assert "x-request-id" in response.headers
    assert response.headers["x-request-id"]
```

`client` is the fixture from `tests/http/conftest.py`. It uses in-memory adapters and test tokens; it does not need Postgres.

```bash
uv run pytest tests/http/test_observability.py -q
```

```text
..                                                                       [100%]
2 passed in 0.05s
```

The course's R6 check is the first test: same header name, same value `acceptance-trace-42`.

Walk one call: header in → middleware → `/health` returns `{"service":"gold-pasal","status":"ok"}` and does not mention the id → middleware sets `x-request-id` → TestClient exposes it lower-case. The health handler stays three lines.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Header missing on `/health` | `install_request_context` not called | Call it in `create_app` before routes run; order of include_router does not matter |
| New UUID even when the client sent a value | Lookup used `X-Request-ID` as the stored key | Read `x-request-id` |
| `AssertionError` on `response.headers["x-request-id"]` | You set `X-Request-ID` on the way out only | Starlette canonicalizes to lower-case; either name works for assignment, the test reads lower-case |
| Middleware runs but 404 has no header | You set the header inside `health()` only | Set it on the `response` from `call_next` |
| `pyright` on `call_next` | Missing `Callable` / `Awaitable` annotations | Copy the signature above |

## Practice

<LessonQuiz
  question="The client sends X-Request-ID: acceptance-trace-42. What does GET /health return as x-request-id?"
  a="A new uuid4, always, so ids cannot collide"
  b="acceptance-trace-42"
  c="The Authorization token"
  d="Nothing; health is excluded from middleware"
  correct="b"
>

Reuse the incoming value when it is present. Generate a UUID only when the header is missing or blank. The check is exact string equality.

</LessonQuiz>

Next: [Add /ready and safe 404s](06-add-ready-and-safe-404s). The same `request.state.request_id` goes into problem JSON.

<EvidenceCard
  command="curl -s -D - -H X-Request-ID:acceptance-trace-42 http://127.0.0.1:8000/health"
  artifact="x-request-id: acceptance-trace-42; tests/http/test_observability.py green"
  invariant="One request has one id from the incoming header (or a generated UUID) to the outgoing header. Middleware sets it, not the health handler."
/>
