---
id: r6-07
title: "Structured JSON logs"
release: r6
order: 7
prerequisites: [r6-06]
outcomes:
  - Emit one JSON log line per HTTP request with request_id, method, path, status, duration_ms
  - Bind request_id with a ContextVar so domain log lines carry it
  - Never log Authorization or token values
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="Uvicorn writes INFO: 127.0.0.1:60761 - GET /health 200 OK. You cannot grep that for incident-7, and a debug print of request.headers would paste a bearer token into the log."
  destination="One JSON object per request containing request_id, method, path, status, and duration_ms. curl -H X-Request-ID:incident-7 produces a line you can grep."
/>

# Structured JSON logs

R2 taught `logging.getLogger(__name__)` and lazy `%s` formatting. Those lines are still sentences. A **structured** log line is a JSON object with fields a collector can index. You grep `incident-7` and get the 404, not three other requests that happened to print the letters "incident" in a message.

A **ContextVar** is a per-task slot. Middleware sets `request_id` at the start of the call. A logging `Filter` copies it onto every `LogRecord` while that call is running, including `logger.info` from `orders.py`. After the response, middleware resets the slot so the next request cannot inherit the id.

## See the idea first

Add this to `src/gold_pasal/api/observability.py` (keep `install_request_context`; you will extend it):

```python
import json
import logging
import time
from contextvars import ContextVar
from typing import Any

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
logger = logging.getLogger("gold_pasal.api")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": getattr(record, "request_id", None),
            "method": getattr(record, "method", None),
            "path": getattr(record, "path", None),
            "status": getattr(record, "status", None),
            "duration_ms": getattr(record, "duration_ms", None),
        }
        return json.dumps({key: value for key, value in payload.items() if value is not None})


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.access").propagate = False
```

`JsonFormatter.format` builds a dict, drops empty fields, and dumps JSON. `record.getMessage()` is the already-interpolated `msg`. Extra attributes (`method`, `path`, `status`, `duration_ms`) exist only on the HTTP line you will log from middleware; a pricing log from R2 has `msg` and `request_id` only.

`RequestIdFilter` runs on every record that hits this handler. It does not look at HTTP headers. It reads the ContextVar.

`configure_logging` replaces the root handlers so you do not get one JSON line and one uvicorn prose line for the same request. Clearing `uvicorn.access` stops the `127.0.0.1 - GET ...` line that has no request id.

Call `configure_logging()` once at the start of `create_app`, before `FastAPI(...)`. Calling it twice in tests would stack handlers; guard it:

```python
_logging_configured = False


def configure_logging() -> None:
    global _logging_configured
    if _logging_configured:
        return
    ...
    _logging_configured = True
```

## Log after the handler, while the ContextVar is set

Replace the body of `request_context` so it sets the ContextVar, logs, then resets. Log **inside** the `try`, not after `reset`, or `request_id` on the JSON line will be missing.

```python
        incoming = request.headers.get("x-request-id")
        request_id = incoming.strip() if incoming and incoming.strip() else str(uuid.uuid4())
        request.state.request_id = request_id
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
            response.headers["x-request-id"] = request_id
            duration_ms = round((time.perf_counter() - started) * 1000, 1)
            logger.info(
                "request finished",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
            return response
        finally:
            request_id_var.reset(token)
```

`request.url.path` is `/api/catalog/items/GP-DOES-NOT-EXIST` with no query string. Do not log `str(request.url)` (query strings can hold tokens). Do not log `request.headers`. Do not log `Authorization`. `extra=` keys become attributes on the `LogRecord`; the formatter picks the ones it knows.

`time.perf_counter()` is a monotonic clock. Subtracting two readings is a duration. It is not wall time and is not timezone-aware.

## Prove it

Restart uvicorn from `gold-pasal`. In another terminal:

```bash
curl -s -o /dev/null -H "X-Request-ID: incident-7" \
  http://127.0.0.1:8000/api/catalog/items/GP-DOES-NOT-EXIST
```

The server terminal prints:

```text
{"ts": "2026-09-21T19:42:08Z", "level": "INFO", "logger": "gold_pasal.api", "msg": "request finished", "request_id": "incident-7", "method": "GET", "path": "/api/catalog/items/GP-DOES-NOT-EXIST", "status": 404, "duration_ms": 0.8}
```

`ts` and `duration_ms` will differ. `request_id` must be `incident-7`. `status` must be `404`. There is no bearer token in the line.

Grep the same way an incident starts:

```bash
# in the terminal that is running uvicorn, or a file you redirected logs to
```

If you started uvicorn as `uv run uvicorn gold_pasal.api.app:app --port 8000 2> /tmp/gold-pasal.log`:

```bash
grep incident-7 /tmp/gold-pasal.log
```

One object. That is the whole point.

Add a test that the access line is JSON and includes the id. `caplog` sees the message, not always your JSON formatter, so assert on the logger's extra via a captured `LogRecord`, or parse stdout. A small, honest HTTP test:

```python
import json
import logging


def test_request_log_includes_request_id(client: TestClient, caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.INFO, logger="gold_pasal.api"):
        client.get("/health", headers={"X-Request-ID": "acceptance-trace-42"})
    records = [record for record in caplog.records if record.getMessage() == "request finished"]
    assert records
    assert records[0].request_id == "acceptance-trace-42"
    assert records[0].path == "/health"
    assert records[0].status == 200
```

Import `pytest` at the top of the test module. `caplog.records` are `LogRecord`s; `RequestIdFilter` set `request_id` because TestClient runs the middleware.

```bash
uv run pytest tests/http/test_observability.py -q
```

All previous tests plus this one, green.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| JSON line has no `request_id` | You logged after `request_id_var.reset` | Log inside `try`, before `finally` |
| Two lines per request, one not JSON | `uvicorn.access` still propagating | Clear its handlers in `configure_logging` |
| `KeyError: 'request_id'` on the record | Filter not attached to the handler caplog uses | Assert after a real request through TestClient; filter is on the root handler you installed |
| Token in the log | You logged headers or `get_secret_value()` | Log path and method only |
| `TypeError: extra` | A key in `extra` collides with `LogRecord` (`name`, `message`, `args`) | Stick to `method`, `path`, `status`, `duration_ms` |
| Tests print JSON noise | Root logger at INFO during pytest | Fine; or set `gold_pasal.api` to WARNING in `conftest.py` if it drowns assertions |

## Practice

<LessonQuiz
  question="Where must middleware call logger.info so the JSON line includes request_id?"
  a="After request_id_var.reset in finally"
  b="Inside the try, after call_next, while the ContextVar is still set"
  c="In the health handler only"
  d="From a background thread started with threading.Thread"
  correct="b"
>

The filter reads the ContextVar at format time. Reset happens in `finally` so the next request cannot see this id. The log call has to happen before that reset.

</LessonQuiz>

Next: [Layered tests and EXPLAIN](08-layered-tests-and-explain). Separate the three pytest commands, then look at the catalog list plan.

<EvidenceCard
  command="grep incident-7 /tmp/gold-pasal.log"
  artifact="one JSON line with request_id incident-7, path, status 404, no Authorization"
  invariant="Every request produces one structured line keyed by request_id. Secrets are not fields."
/>
