---
id: r3-06
title: "Test the API with HTTPX"
release: r3
order: 6
prerequisites: [r3-05]
outcomes:
  - Drive the app in-process with TestClient and a fresh create_app() per test
  - Cover health, the OpenAPI contract, create, list, read, and every problem response
  - Keep tests/http green under ./scripts/verify.sh with no port and no network
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="curl on a laptop is not a regression suite. A restart wipes memory, nobody reruns the 19K case, and the reviewer cannot see what was checked."
  destination="tests/http drives the app in-process through TestClient, one fresh app per test, and asserts the whole R3 contract including problem details."
/>

# Test the API with HTTPX

**HTTPX** is an HTTP client library. FastAPI's **TestClient** is an HTTPX client wired straight into the app object: `client.get("/health")` runs your handler without a socket, a port, or uvicorn. The tests read like the curls from the earlier pages and run in milliseconds.

## See the idea first

From `gold-pasal`:

```bash
uv add --group dev httpx2
```

`httpx2` is the package Starlette's `TestClient` imports. (Older tutorials say `httpx`; with this FastAPI version that name triggers a deprecation warning and leaves the client untyped for pyright.)

Then in `uv run python`:

```python
>>> from fastapi.testclient import TestClient
>>> from gold_pasal.api.app import create_app
>>> client = TestClient(create_app())
>>> response = client.get("/health")
>>> response.status_code, response.json()
(200, {'service': 'gold-pasal', 'status': 'ok'})
```

No server was started. The client called the app in this process.

## A fixture per test

Create `tests/http/conftest.py`:

```python
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from gold_pasal.api.app import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client
```

`create_app()` inside the fixture is the whole isolation story: each test gets a new app with a new empty `InMemoryCatalog`. A ring posted in one test cannot appear in the next. The `with` block runs the app's startup and shutdown events around the test, which matters once R4 adds a lifespan.

The fixture lives in `tests/http/conftest.py`, not `tests/conftest.py`, because only HTTP tests want it ([R2's placement rule](/releases/r2/03-organize-tests-conftest-and-markers)).

## The contract tests

Create `tests/http/test_catalog_api.py`:

```python
from fastapi.testclient import TestClient

RING = {
    "sku": "GP-RING-0001",
    "name": "Sajilo 22K Ring",
    "metal": "gold",
    "karat": 22,
    "weight_grams": "5.20",
}


def test_health_names_the_shop(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"service": "gold-pasal", "status": "ok"}


def test_openapi_documents_the_catalog_path(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]

    assert "/api/catalog/items" in paths
    assert "/api/catalog/items/{sku}" in paths


def test_create_then_filter_by_karat_finds_the_ring(client: TestClient) -> None:
    created = client.post("/api/catalog/items", json=RING)
    listed = client.get("/api/catalog/items", params={"karat": 22, "limit": 20})

    assert created.status_code == 201, created.text
    assert created.json()["weight_grams"] == "5.20"
    assert [item["sku"] for item in listed.json()["items"]] == ["GP-RING-0001"]


def test_other_karat_filter_does_not_include_the_ring(client: TestClient) -> None:
    client.post("/api/catalog/items", json=RING)

    listed = client.get("/api/catalog/items", params={"karat": 18})

    assert listed.json()["items"] == []


def test_read_one_item_by_sku(client: TestClient) -> None:
    client.post("/api/catalog/items", json=RING)

    response = client.get("/api/catalog/items/GP-RING-0001")

    assert response.status_code == 200
    assert response.json()["name"] == "Sajilo 22K Ring"


def test_unknown_sku_is_a_404_problem(client: TestClient) -> None:
    response = client.get("/api/catalog/items/GP-NOPE")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["type"].endswith("/unknown-sku")


def test_invalid_purity_is_a_422_problem(client: TestClient) -> None:
    response = client.post("/api/catalog/items", json={**RING, "karat": 19})

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert {"type", "title", "status", "detail"} <= response.json().keys()
    assert response.json()["detail"] == "karat must be one of 14, 18, 22, 24; got 19"


def test_duplicate_sku_is_a_409_problem(client: TestClient) -> None:
    client.post("/api/catalog/items", json=RING)

    response = client.post("/api/catalog/items", json=RING)

    assert response.status_code == 409
    assert response.json()["type"].endswith("/duplicate-sku")


def test_malformed_body_is_a_422_problem(client: TestClient) -> None:
    response = client.post("/api/catalog/items", json={**RING, "weight_grams": "heavy"})

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["detail"].startswith("weight_grams:")
```

```bash
uv run pytest tests/http -q
```

```text
.........                                                                [100%]
9 passed in 0.11s
```

Nine tests, a tenth of a second, no port.

### Reading the client calls

| Call | Sends |
| --- | --- |
| `client.get("/health")` | `GET /health` |
| `client.post(path, json=RING)` | `POST` with `RING` as the JSON body and the right `content-type` |
| `client.get(path, params={"karat": 22})` | `GET path?karat=22` |
| `response.status_code` | the integer status |
| `response.json()` | the parsed body |
| `response.headers["content-type"]` | one header |
| `response.text` | the raw body, useful in an assertion message |

`{**RING, "karat": 19}` builds a copy of the ring with one field changed (the [R1 unpacking idiom](/releases/r1/05-generators-files-and-decorators)). `RING` itself is never mutated, so every test starts from the same body.

`assert created.status_code == 201, created.text` puts the response body in the failure message. When a create fails, you want to see the problem document, not just `422 != 201`.

### What each test pins

| Test | Contract fact |
| --- | --- |
| health | service name the course check reads |
| openapi | the two paths are documented |
| create then filter | the R3 check's main scenario: POST 201, GET by karat finds it |
| other karat | the filter is a real filter |
| read one | path parameter works |
| unknown sku | 404 as a problem, with the right `type` |
| invalid purity | 422 problem, media type, four keys, the domain's message |
| duplicate | 409 problem |
| malformed body | Pydantic errors are reshaped too |

The invalid-purity test asserts the exact `detail`. That string is written once, in `UnsupportedKaratError`, and this test proves it reaches the wire unchanged.

## Test through HTTP, not around it

These tests call `client.post`, not `create_item(body, catalog)`. The handler function could be called directly, and for a complicated handler a unit test of it is fine. But the contract is the HTTP surface: status codes, headers, JSON shapes, and the error handlers. Only a request through the app exercises all of that. Do not mock `catalog.add` inside an HTTP test; the fake repository is fast and real, and the point is the round trip.

::: tip One assertion style
Prefer `response.json() == {...}` for small bodies (health) and targeted keys for larger ones (`["detail"]`, `["type"].endswith(...)`). Asserting an entire item body ties the test to field order and to every future field; asserting the two facts you care about does not.
:::

## Where this sits in the suite

```bash
./scripts/verify.sh
```

`verify.sh` runs `pytest -m "not integration"`, and these tests carry no marker, so they run on every verify and in CI. They need no database, no network, and no running server. R4's tests that start PostgreSQL in a container will be marked `integration` and live in `tests/inventory/`; `tests/http/` stays fast.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `RuntimeError: The starlette.testclient module requires the httpx2 package` | Missing dev dependency | `uv add --group dev httpx2` |
| `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated` | Installed `httpx` instead | Add `httpx2`; remove `httpx` from the dev group |
| pyright `Type of "status_code" is unknown` | `TestClient` untyped because `httpx2` is absent | Same fix |
| A test sees another test's ring | Client fixture reuses one app | `create_app()` inside the fixture, function scope |
| `422` where `201` was expected, no detail shown | Assertion message missing | `assert ..., created.text` |
| `fixture 'client' not found` | `conftest.py` in the wrong folder | `tests/http/conftest.py` |

## Practice

<LessonQuiz
  question="Two HTTP tests each POST GP-RING-0001 and pass alone but one fails with 409 when run together. What is wrong?"
  a="The SKU pattern is too strict"
  b="The client fixture shares one app across tests; each test needs create_app()"
  c="TestClient caches responses"
  d="The 409 handler is registered twice"
  correct="b"
>

A shared app means a shared `InMemoryCatalog`, so the second POST is a duplicate. Building the app inside the fixture gives every test an empty catalog, which is the reason `create_app` exists.

</LessonQuiz>

Next: [Release gate: catalog from curl](07-release-gate-catalog-from-curl).

<EvidenceCard
  command="uv run pytest tests/http -q"
  artifact="tests/http/conftest.py and nine contract tests through TestClient"
  invariant="The R3 contract is proved in-process on every verify, without a running port"
/>
