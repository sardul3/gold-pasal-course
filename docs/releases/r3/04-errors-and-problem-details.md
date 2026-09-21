---
id: r3-04
title: "Errors and problem details"
release: r3
order: 4
prerequisites: [r3-03]
outcomes:
  - Return RFC 9457 problem details with the application/problem+json media type
  - Register exception handlers that map domain errors to 404, 409, and 422
  - Reshape FastAPI's default validation error into the same document
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="Karat 19 is a 500 with a traceback in the server log. An unknown SKU is another 500. A bad weight is a 422 in Pydantic's shape. Three failures, three shapes, and none of them tells the tablet what to show Sita."
  destination="Every expected failure is a problem-details document: type, title, status, detail, served as application/problem+json. Karat 19 is 422 with the domain's own message."
/>

# Errors and problem details

A **problem details** document is a small JSON object standardised in RFC 9457 (formerly 7807): `type` (a URL naming the kind of problem), `title` (a short human label), `status` (the HTTP code), and `detail` (this occurrence's message). Its media type is `application/problem+json`. One shape for every error means one parser on every client.

## See the idea first

With uvicorn running, the failure from the previous pages:

```bash
curl -s -i -X POST http://127.0.0.1:8000/api/catalog/items \
  -H "content-type: application/json" \
  -d '{"sku":"GP-RING-BAD","name":"Invalid purity ring","metal":"gold","karat":19,"weight_grams":"5.20"}' | head -1
```

```text
HTTP/1.1 500 Internal Server Error
```

By the end of this page the same request answers:

```text
HTTP/1.1 422 Unprocessable Entity
content-type: application/problem+json

{"type":"https://gold-pasal.example/problems/invalid-purity","title":"Invalid purity","status":422,"detail":"karat must be one of 14, 18, 22, 24; got 19"}
```

The `detail` is the string from `UnsupportedKaratError`. The domain wrote the message once; the API delivers it.

## Exception handlers

FastAPI lets you register a function to run whenever a given exception type escapes a handler. Create `src/gold_pasal/api/problems.py`:

```python
"""RFC 9457 problem details for every expected failure."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from gold_pasal.errors import (
    DuplicateSkuError,
    PricingError,
    UnknownSkuError,
    UnsupportedKaratError,
)

PROBLEM_TYPE_BASE = "https://gold-pasal.example/problems"
PROBLEM_MEDIA_TYPE = "application/problem+json"


class Problem(BaseModel):
    type: str
    title: str
    status: int
    detail: str


def problem_response(*, slug: str, title: str, status: int, detail: str) -> JSONResponse:
    body = Problem(type=f"{PROBLEM_TYPE_BASE}/{slug}", title=title, status=status, detail=detail)
    return JSONResponse(
        status_code=status, content=body.model_dump(), media_type=PROBLEM_MEDIA_TYPE
    )


def register_problem_handlers(app: FastAPI) -> None:
    @app.exception_handler(UnsupportedKaratError)
    async def invalid_purity(_: Request, exc: UnsupportedKaratError) -> JSONResponse:
        return problem_response(
            slug="invalid-purity", title="Invalid purity", status=422, detail=str(exc)
        )

    @app.exception_handler(PricingError)
    async def invalid_amount(_: Request, exc: PricingError) -> JSONResponse:
        return problem_response(
            slug="invalid-amount", title="Invalid amount", status=422, detail=str(exc)
        )

    @app.exception_handler(UnknownSkuError)
    async def unknown_sku(_: Request, exc: UnknownSkuError) -> JSONResponse:
        return problem_response(
            slug="unknown-sku", title="Unknown SKU", status=404, detail=str(exc)
        )

    @app.exception_handler(DuplicateSkuError)
    async def duplicate_sku(_: Request, exc: DuplicateSkuError) -> JSONResponse:
        return problem_response(
            slug="duplicate-sku", title="Duplicate SKU", status=409, detail=str(exc)
        )

    @app.exception_handler(RequestValidationError)
    async def invalid_body(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0]
        location = ".".join(str(part) for part in first["loc"] if part != "body")
        return problem_response(
            slug="invalid-request",
            title="Invalid request",
            status=422,
            detail=f"{location}: {first['msg']}",
        )
```

Register them in `app.py`, after the routes:

```python
from gold_pasal.api.problems import register_problem_handlers

...

register_problem_handlers(app)
```

### How it reads

`Problem` is a Pydantic model for the response body, so the four fields are typed and documented like every other schema. `problem_response` builds one and wraps it in a `JSONResponse` with the status code and the problem media type; this is the one place in the API that sets `content-type` by hand.

Each `@app.exception_handler(SomeError)` function receives the request and the exception and returns a response. `str(exc)` is the message the domain wrote. Handlers are `async def` because FastAPI calls them on the event loop; they do no waiting, so that is a formality.

### Which handler wins

`UnsupportedKaratError` is a subclass of `PricingError`. Both have handlers. FastAPI picks the most specific match by walking the exception's class hierarchy, so karat 19 gets `invalid-purity` and a zero rate would get `invalid-amount`. Register the specific handler and the general one; order in the file does not matter.

### The validation error

`RequestValidationError` is what FastAPI raises when Pydantic rejects a body, path, or query parameter. Its default response is `{"detail": [...]}` with `application/json`. The handler above reshapes it: take the first error, join its `loc` (dropping the `body` prefix) into `weight_grams` or `query.limit`, and put that with the message in `detail`. Clients get one shape for "your input is wrong" whether Pydantic or the domain said so.

## Try every path

Restart uvicorn and run each failure. Karat 19:

```text
HTTP/1.1 422 Unprocessable Entity
content-type: application/problem+json

{"type":"https://gold-pasal.example/problems/invalid-purity","title":"Invalid purity","status":422,"detail":"karat must be one of 14, 18, 22, 24; got 19"}
```

Unknown SKU:

```bash
curl -s -i http://127.0.0.1:8000/api/catalog/items/GP-NOPE
```

```text
HTTP/1.1 404 Not Found
content-type: application/problem+json

{"type":"https://gold-pasal.example/problems/unknown-sku","title":"Unknown SKU","status":404,"detail":"no catalog item with sku 'GP-NOPE'"}
```

Post the same SKU twice:

```text
{"type":"https://gold-pasal.example/problems/duplicate-sku","title":"Duplicate SKU","status":409,"detail":"catalog already has sku 'GP-RING-0001'"}
```

Bad weight and bad limit:

```text
{"type":"https://gold-pasal.example/problems/invalid-request","title":"Invalid request","status":422,"detail":"weight_grams: Input should be a valid decimal"}
{"type":"https://gold-pasal.example/problems/invalid-request","title":"Invalid request","status":422,"detail":"query.limit: Input should be greater than or equal to 1"}
```

Five failures, one shape. The course's R3 check asserts the 422, the media type prefix, and the four keys on the karat 19 case.

## Choosing status codes

| Situation | Code | Why |
| --- | --- | --- |
| body or query fails the schema | `422` | understood, invalid |
| body passes the schema, breaks a business rule (karat 19, zero grams) | `422` | same category from the client's view |
| resource named in the path does not exist | `404` | nothing there |
| create would collide with an existing SKU | `409` | conflict with current state |
| a bug in the server | `500` | never mapped on purpose |

`400 Bad Request` is the generic "you sent something wrong". This API uses `422` for every validation failure so clients have one code to handle. Pick one and stay consistent.

The `type` URL does not have to resolve. It is an identifier; clients compare it as a string (`type.endswith("/unknown-sku")`). If the shop later publishes a page at each URL, better.

## What does not get a handler

`Exception` in general. If something unexpected escapes, uvicorn returns a plain `500` and logs the traceback. That is correct: an unexpected error is a bug to fix, not a case to make pretty. A catch-all handler that turns every crash into a tidy JSON body hides bugs from the log where you would find them. R6 adds request ids to the 500 so a shopper can quote one and you can find the traceback; it still does not swallow it.

::: warning No tracebacks in detail
`detail` is for the client. `str(exc)` on a domain error is a sentence the shop wrote. `str(exc)` on an arbitrary exception can include file paths, SQL, or a token. Only map exceptions whose messages you control.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Still `500` for karat 19 | `register_problem_handlers(app)` never called | Call it in `app.py` after building `app` |
| `422` but `content-type: application/json` | Default FastAPI validation response | The `RequestValidationError` handler is missing |
| Karat 19 comes back as `invalid-amount` | Only the `PricingError` handler registered | Add the `UnsupportedKaratError` handler; specificity wins |
| `detail` is a list | Returned `exc.errors()` directly | Pick the first error and format a string |
| `TypeError: Object of type Decimal is not JSON serializable` | Put a Decimal into `content=` | `Problem` fields are `str` and `int`; format Decimals as text |
| `404` for an unknown SKU has `{"detail":"Not Found"}` | Starlette's default 404, route mismatch | Path template typo; the handler only runs for `UnknownSkuError` |

## Practice

<LessonQuiz
  question="A client POSTs a ring whose SKU already exists. Which response is right?"
  a="200 with the existing item"
  b="409 application/problem+json with type ending /duplicate-sku"
  c="422 invalid-request"
  d="500, because the repository raised"
  correct="b"
>

The body is valid; it conflicts with current state, which is what 409 means. `DuplicateSkuError` has its own handler and its own `type`, so the tablet can tell "already exists" from "typed it wrong" without parsing English.

</LessonQuiz>

Next: [Dependency injection and routers](05-dependency-injection-and-routers), which removes the module-level `catalog` so tests can supply their own.

<EvidenceCard
  command="curl -s -i -X POST http://127.0.0.1:8000/api/catalog/items with a karat 19 body"
  artifact="api/problems.py mapping five failures to application/problem+json"
  invariant="An unsupported karat never becomes a catalog row and never becomes a 500"
/>
