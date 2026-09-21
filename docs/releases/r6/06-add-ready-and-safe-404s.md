---
id: r6-06
title: "Add /ready and safe 404s"
release: r6
order: 6
prerequisites: [r6-05]
outcomes:
  - Serve GET /ready in OpenAPI
  - Ping PostgreSQL from /ready when a session factory exists
  - Put request_id on problem details; never return a traceback in the body
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="A load balancer needs a URL that means the shop can take traffic, not merely that Python is running. A missing SKU still returns problem JSON without the request id, so the shopper's screenshot cannot be grepped."
  destination="/ready is in OpenAPI. GP-DOES-NOT-EXIST is 404 application/problem+json with request_id and no traceback."
/>

# Add /ready and safe 404s

`GET /health` means the process answers. **Readiness** is a stricter question: can this process serve shop traffic right now? For Gold Pasal that means PostgreSQL accepts `SELECT 1` when the app was started with a database. When tests build an in-memory app, `/ready` still returns 200 so TestClient stays Docker-free.

The R6 check looks at OpenAPI for both `/health` and `/ready`, and at `GET /api/catalog/items/GP-DOES-NOT-EXIST` for a 404 problem document that includes `request_id` and does not contain the word `traceback`.

## See the idea first

With uvicorn still running from the last page:

```bash
curl -s http://127.0.0.1:8000/api/catalog/items/GP-DOES-NOT-EXIST
```

```text
{"type":"https://gold-pasal.example/problems/unknown-sku","title":"Unknown SKU","status":404,"detail":"no catalog item with sku 'GP-DOES-NOT-EXIST'"}
```

Four fields, no `request_id`. `GET /ready` is still missing. In `src/gold_pasal/api/problems.py`, add the field and thread `Request` through `problem_response`:

```python
class Problem(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    request_id: str | None = None


def problem_response(
    request: Request,
    *,
    slug: str,
    title: str,
    status: int,
    detail: str,
) -> JSONResponse:
    body = Problem(
        type=f"{PROBLEM_TYPE_BASE}/{slug}",
        title=title,
        status=status,
        detail=detail,
        request_id=getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=status, content=body.model_dump(), media_type=PROBLEM_MEDIA_TYPE
    )
```

Each handler already receives `Request` as the first argument and named it `_`. Rename it and pass it:

```python
    @app.exception_handler(UnknownSkuError)
    async def unknown_sku(request: Request, exc: UnknownSkuError) -> JSONResponse:
        return problem_response(
            request,
            slug="unknown-sku",
            title="Unknown SKU",
            status=404,
            detail=str(exc),
        )
```

Do the same for every other handler in that file: invalid purity, invalid amount, duplicate SKU, inventory errors, auth errors, payment declined, idempotency reuse, `RequestValidationError`. `str(exc)` stays the domain message. Do not pass `traceback.format_exc()`. Do not start FastAPI with `debug=True`; the HTML debug page is how the word `traceback` leaks into a body.

## GET /ready

In `src/gold_pasal/api/app.py`, add the route next to `health`. Import `text` from SQLAlchemy and `OperationalError`. Use the `problem_response` you just changed:

```python
from fastapi import Request
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from gold_pasal.api.problems import problem_response


@app.get("/ready")
def ready(request: Request) -> dict[str, str]:
    factory = getattr(app.state, "session_factory", None)
    if factory is None:
        return {"status": "ready"}
    try:
        with factory() as session:
            session.execute(text("SELECT 1"))
    except OperationalError:
        return problem_response(
            request,
            slug="not-ready",
            title="Not ready",
            status=503,
            detail="database unavailable",
        )
    return {"status": "ready"}
```

pyright will complain that a route annotated `dict[str, str]` sometimes returns `JSONResponse`. Drop the return annotation, or annotate `dict[str, str] | JSONResponse` and import `JSONResponse`.

`app.state` is in scope if this function is defined inside `create_app`, the same way `health` is. If it is a module-level function, read `request.app.state.session_factory`.

Walk the in-memory case: HTTP tests call `create_app` without `session_factory`. `getattr` returns `None`. 200 `{"status":"ready"}`. No connection attempt.

Walk the Compose case: `app_from_env` built a factory. `SELECT 1` is one round-trip. If Postgres is down, SQLAlchemy raises `OperationalError` and you return **503** problem details. A load balancer stops sending shoppers. `/health` can still be 200 so you can tell "process up, database down" from "process dead".

Restart uvicorn and:

```bash
curl -s http://127.0.0.1:8000/ready
curl -s http://127.0.0.1:8000/openapi.json | python3 -c "import json,sys; print('/ready' in json.load(sys.stdin)['paths'])"
```

```text
{"status":"ready"}
True
```

If Compose is up and `DATABASE_URL` is set, that 200 included a real ping. If you started uvicorn without a database, it is the in-memory branch.

## Prove the missing SKU

```bash
curl -s -D - -H "X-Request-ID: incident-7" \
  http://127.0.0.1:8000/api/catalog/items/GP-DOES-NOT-EXIST
```

```text
HTTP/1.1 404 Not Found
date: Mon, 21 Sep 2026 13:57:08 GMT
server: uvicorn
content-length: 175
content-type: application/problem+json
x-request-id: incident-7

{"type":"https://gold-pasal.example/problems/unknown-sku","title":"Unknown SKU","status":404,"detail":"no catalog item with sku 'GP-DOES-NOT-EXIST'","request_id":"incident-7"}
```

Three places, one string: the request header you sent, the response header from middleware, the JSON field from the exception handler. `content-length` may differ by a byte if spacing differs; the keys must match.

Add to `tests/http/test_observability.py`:

```python
def test_missing_sku_problem_includes_request_id(client: TestClient) -> None:
    response = client.get(
        "/api/catalog/items/GP-DOES-NOT-EXIST",
        headers={"X-Request-ID": "incident-7"},
    )
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    problem = response.json()
    assert problem["status"] == 404
    assert problem["request_id"] == "incident-7"
    assert "traceback" not in response.text.lower()


def test_ready_is_documented(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert "/health" in paths
    assert "/ready" in paths
```

```bash
uv run pytest tests/http/test_observability.py -q
```

```text
....                                                                     [100%]
4 passed in 0.06s
```

Those four tests are the R6 contract. Run `./scripts/verify.sh` after pyright sees the new `problem_response` signature; every call site has to pass `request`.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `/ready` missing in OpenAPI | Route not registered on the same `app` | Define it inside `create_app` or include a router that `create_app` mounts |
| 404 JSON has no `request_id` | Handler still uses `_` and the old `problem_response` | Thread `request` through |
| `request_id` is null | Middleware ran after the exception handler, or not at all | `install_request_context` is the first thing after `FastAPI()` |
| Body contains `Traceback` | `debug=True`, or `str(exc)` on an exception whose message includes a stack | Keep `debug` off; domain errors use a one-line message |
| `/ready` 503 in HTTP tests | Test app has a factory pointing at a down database | Tests should pass `session_factory=None` |
| pyright: too few arguments | A handler still calls `problem_response(slug=...)` | First positional arg is `request` |

## Practice

<LessonQuiz
  question="Postgres is down. What should GET /health and GET /ready return?"
  a="Both 200; they are aliases"
  b="health 200 if the process answers; ready 503 problem details"
  c="Both 500 with a Python traceback in the body"
  d="ready 404, because the database is missing"
  correct="b"
>

Liveness is the process. Readiness is dependencies. A traceback in either body fails the missing-SKU check's spirit and leaks paths. 503 on `/ready` is enough for a balancer to stop traffic.

</LessonQuiz>

Next: [Structured JSON logs](07-structured-json-logs), one greppable line per request.

<EvidenceCard
  command="curl -s http://127.0.0.1:8000/api/catalog/items/GP-DOES-NOT-EXIST"
  artifact="/ready in OpenAPI; 404 problem JSON with request_id; no traceback"
  invariant="Failures are problem details with the request id. /ready can fail when the database cannot."
/>
