---
id: r3-01
title: "HTTP and the first FastAPI app"
release: r3
order: 1
prerequisites: []
outcomes:
  - Add fastapi and uvicorn and serve GET /health
  - Read a raw HTTP response: status line, headers, body
  - Open /docs and /openapi.json and name what FastAPI generated
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="The counter tablet speaks HTTP. gold_pasal speaks Python. There is no process listening on a port, so nothing on the tablet can reach the catalog."
  destination="uvicorn serves gold_pasal.api.app:app on port 8000, /health answers with the service name, and /docs shows the generated contract."
/>

# HTTP and the first FastAPI app

**HTTP** is the request-response protocol browsers, tablets, and other services use. A **web framework** turns a request into a Python function call and the return value into a response. **FastAPI** is the framework this shop uses; **uvicorn** is the server process that listens on a port and hands requests to it. This page gets one endpoint running and reads what it sends back.

## See the idea first

From `gold-pasal`:

```bash
uv add fastapi uvicorn
```

Create `src/gold_pasal/api/__init__.py` (a docstring is enough) and `src/gold_pasal/api/app.py`:

```python
"""Build the FastAPI application. `app` is what uvicorn serves."""

from fastapi import FastAPI

from gold_pasal import __version__

SERVICE_NAME = "gold-pasal"

app = FastAPI(title="Gold Pasal", version=__version__)


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": SERVICE_NAME, "status": "ok"}
```

Start the server:

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000
```

```text
INFO:     Started server process [14615]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

The terminal is now busy. Open a second one, `cd` to `gold-pasal`, and ask:

```bash
curl -s -i http://127.0.0.1:8000/health
```

```text
HTTP/1.1 200 OK
date: Mon, 21 Sep 2026 12:01:28 GMT
server: uvicorn
content-length: 38
content-type: application/json

{"service":"gold-pasal","status":"ok"}
```

A Python function answered an HTTP request. The first terminal logged it:

```text
INFO:     127.0.0.1:60761 - "GET /health HTTP/1.1" 200 OK
```

## Read the response

`curl -i` prints the whole response. Three parts, top to bottom:

| Part | In the output | Meaning |
| --- | --- | --- |
| status line | `HTTP/1.1 200 OK` | protocol version, **status code**, reason phrase |
| headers | `content-type: application/json` and friends | metadata about the body |
| body | `{"service":"gold-pasal","status":"ok"}` | the payload, here JSON |

FastAPI converted the returned `dict` to JSON and set `content-type` for you. `content-length` is the byte count. `date` and `server` come from uvicorn.

### Status codes you will use

| Code | Meaning | This release |
| --- | --- | --- |
| `200 OK` | success with a body | `GET /health`, list, read |
| `201 Created` | success; something new exists | `POST /api/catalog/items` |
| `404 Not Found` | no such resource | unknown SKU |
| `405 Method Not Allowed` | path exists, verb does not | `DELETE /health` |
| `409 Conflict` | the request contradicts current state | duplicate SKU |
| `422 Unprocessable Entity` | body understood but invalid | karat 19 |
| `500 Internal Server Error` | the server crashed | a bug; never intentional |

Try the 405:

```bash
curl -s -i -X DELETE http://127.0.0.1:8000/health | head -1
```

```text
HTTP/1.1 405 Method Not Allowed
```

`-X` sets the **method** (verb). `GET` reads. `POST` creates. `PUT`/`PATCH` update. `DELETE` removes. A route is a method plus a path; `/health` has only `GET`.

## The request

`curl` sent something too. See it with `-v`:

```bash
curl -s -v http://127.0.0.1:8000/health 2>&1 | grep '^>'
```

```text
> GET /health HTTP/1.1
> Host: 127.0.0.1:8000
> User-Agent: curl/8.x
> Accept: */*
```

A request has the same shape as a response: a first line (method, path, version), headers, and an optional body. `GET` has no body; the next page's `POST` sends JSON in one.

## What FastAPI wrote for you

Leave uvicorn running and open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) in a browser. That is **Swagger UI**, generated from your code: the `/health` route, its method, and a "Try it out" button that sends the request.

The machine-readable version:

```bash
curl -s http://127.0.0.1:8000/openapi.json | python3 -m json.tool | head -20
```

```json
{
    "openapi": "3.1.0",
    "info": {
        "title": "Gold Pasal",
        "version": "0.1.0"
    },
    "paths": {
        "/health": {
            "get": {
                "summary": "Health",
                ...
```

That document is **OpenAPI**, the standard description of an HTTP API. FastAPI builds it from the function names, type hints, and models you write. `title` and `version` came from the `FastAPI(...)` call; `version` is the package's `__version__`, so the contract and the code cannot disagree about it. The course's R3 check reads this document and expects `/api/catalog/items` in `paths` by the release gate.

### What `@app.get("/health")` did

`@app.get` is a decorator (from [R1](/releases/r1/05-generators-files-and-decorators)) that registers `health` as the handler for `GET /health`. The return annotation `dict[str, str]` tells FastAPI what to document and, later, what to validate. Handlers are plain functions: you can call `health()` in a test without any HTTP at all, and the [HTTPX page](06-test-the-api-with-httpx) shows the in-process alternative.

## How a request reaches your function

```text
tablet or curl
   -> TCP connection to 127.0.0.1:8000
   -> uvicorn parses the HTTP request
   -> FastAPI matches method + path to a handler
   -> your function runs and returns a Python value
   -> FastAPI serializes it to JSON, picks a status code and headers
   -> uvicorn writes the response bytes
```

uvicorn speaks **ASGI** to FastAPI, a Python interface between servers and frameworks. You will not write ASGI code; you will see the word in error messages and `TestClient` docs.

`def health()` is a sync function and FastAPI runs it in a worker thread. `async def` handlers run on the event loop. The catalog in this release is in-memory, so plain `def` is right. R4 revisits the choice when a database call can wait on the network.

## Stop and restart

`Ctrl-C` in the uvicorn terminal stops it. While developing, add `--reload` so the server restarts when a file changes:

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000 --reload
```

Do not use `--reload` in a container or on a server; R7 sets the production command.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `Error loading ASGI app. Could not import module "gold_pasal.api.app"` | File not at `src/gold_pasal/api/app.py`, or no `__init__.py` | Check the path; add the package file |
| `Attribute "app" not found in module` | The module has no `app` variable | `app = FastAPI(...)` at module level |
| `Address already in use` | Another process owns port 8000 | `--port 8001` and curl that port, or stop the old server |
| `curl: (7) Failed to connect` | Server not running, or wrong port | Check the uvicorn terminal |
| `ModuleNotFoundError: fastapi` | Not added, or ran plain `python` | `uv add fastapi uvicorn`; use `uv run` |

## Practice

<LessonQuiz
  question="curl -s -i http://127.0.0.1:8000/health prints content-type: application/json. Where did that header come from?"
  a="curl added it because the body looked like JSON"
  b="FastAPI set it when it serialized the returned dict"
  c="You must set it by hand in every handler"
  d="uvicorn guesses it from the file extension"
  correct="b"
>

The handler returned a Python `dict`. FastAPI serialized it to JSON and set the matching `content-type`. The [problem details page](04-errors-and-problem-details) is the one place you will set a content type by hand, because errors use a different one.

</LessonQuiz>

Next: [Pydantic models and request bodies](02-pydantic-models-and-request-bodies), where `POST` carries a ring in its body.

<EvidenceCard
  command="curl -s -i http://127.0.0.1:8000/health"
  artifact="src/gold_pasal/api/app.py serving /health; /docs and /openapi.json generated"
  invariant="The service name and version in the contract come from the code, not from a hand-written file"
/>
