---
id: r3-03
title: "Path and query parameters"
release: r3
order: 3
prerequisites: [r3-02]
outcomes:
  - Read one item with a path parameter on GET /api/catalog/items/{sku}
  - Filter and bound a list with query parameters karat and limit
  - Use Annotated and Query to validate and document parameters
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="POST 201 is not enough. The tablet must find the ring again: by its SKU when Sita scans it, and by karat when a customer asks what 22K pieces are on the tray."
  destination="GET /api/catalog/items/{sku} returns one item; GET /api/catalog/items?karat=22&limit=20 returns a filtered list; a limit of 0 or a karat of 22K is rejected before the handler runs."
/>

# Path and query parameters

A **path parameter** is part of the URL that names one resource: `/api/catalog/items/GP-RING-0001`. A **query parameter** comes after `?` and refines a request: `?karat=22&limit=20`. FastAPI reads both from the function signature: parameters that appear in the path template are path parameters; the rest are query parameters.

## See the idea first

Add a read-one route to `src/gold_pasal/api/app.py`:

```python
@app.get("/api/catalog/items/{sku}", response_model=ItemRead)
def read_item(sku: str) -> ItemRead:
    return ItemRead.from_domain(catalog.get(sku))
```

With uvicorn running and the ring from the previous page posted:

```bash
curl -s http://127.0.0.1:8000/api/catalog/items/GP-RING-0001
```

```text
{"sku":"GP-RING-0001","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}
```

`{sku}` in the path template became the `sku: str` argument. FastAPI matched the URL, pulled `GP-RING-0001` out, and called `read_item("GP-RING-0001")`.

## Path parameters

The name in braces must match the parameter name exactly. The type annotation converts and validates: `{karat}` with `karat: int` would reject `/items/22K` with a 422 before your code runs.

Path parameters identify a resource. Use them for "this one thing": one SKU, one order id. Do not use them for options.

An unknown SKU right now:

```bash
curl -s -i http://127.0.0.1:8000/api/catalog/items/GP-NOPE | head -1
```

```text
HTTP/1.1 500 Internal Server Error
```

`catalog.get` raised `UnknownSkuError` and nothing mapped it to a 404. That is the second entry on the [problem details page](04-errors-and-problem-details)'s list. Leave it for now.

## Query parameters

Add the list route:

```python
from typing import Annotated

from fastapi import Query

from gold_pasal.api.schemas import ItemList


@app.get("/api/catalog/items", response_model=ItemList)
def list_items(
    karat: Annotated[int | None, Query(description="14, 18, 22, or 24")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ItemList:
    items = catalog.list_items(karat=karat, limit=limit)
    return ItemList(items=[ItemRead.from_domain(item) for item in items])
```

`/api/catalog/items` and `/api/catalog/items/{sku}` are different templates; FastAPI tells them apart by the trailing segment.

```bash
curl -s "http://127.0.0.1:8000/api/catalog/items?karat=22&limit=20"
```

```text
{"items":[{"sku":"GP-RING-0001","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}]}
```

Quote the URL in the shell: `&` means something to bash. Now a karat with no matching items:

```bash
curl -s "http://127.0.0.1:8000/api/catalog/items?karat=18"
```

```text
{"items":[]}
```

An empty list is a `200` with `"items": []`, not a `404`. The collection exists; it has no 18K pieces. `404` is for a resource that does not exist, which is what the read-one route will say about `GP-NOPE`.

### Optional, default, and bounded

| Parameter | Declared as | Means |
| --- | --- | --- |
| `karat` | optional `int`, default `None` | absent means no filter |
| `limit` | `int`, default `20`, `Query(ge=1, le=100)` | must be 1 to 100 |

`Annotated[type, Query(...)]` attaches validation and documentation to the parameter without changing its Python type. `ge` is "greater than or equal", `le` "less than or equal". Both go into `/docs` and into the 422 message:

```bash
curl -s "http://127.0.0.1:8000/api/catalog/items?limit=0"
```

```text
{"detail":[{"type":"greater_than_equal","loc":["query","limit"],"msg":"Input should be greater than or equal to 1","input":"0","ctx":{"ge":1}}]}
```

```bash
curl -s "http://127.0.0.1:8000/api/catalog/items?karat=22K"
```

```text
{"detail":[{"type":"int_parsing","loc":["query","karat"],"msg":"Input should be a valid integer, unable to parse string as an integer","input":"22K"}]}
```

Neither request reached `list_items`. `loc` says `query`, then the parameter name. The next page gives these the shop's error shape.

### Why a maximum limit

Without `le=100`, `?limit=1000000` asks the catalog for everything it has. In memory that is a slow response; against PostgreSQL in R4 it is a slow query holding a connection. Bound every list. A client that needs more pages asks again with an offset, which R4 adds when there is a table to page through.

## The list model

`ItemList` wraps the array in an object:

```json
{"items": [...]}
```

A bare JSON array (`[...]`) works too, and you will see it in other APIs. Wrapping it means a `total` or `next` field can be added later without breaking every client that parses the response. The course's R3 check reads `response.json()["items"]`, so the wrapper is part of the contract.

## What the filter does

`catalog.list_items(karat=karat, limit=limit)` is the [R2 repository](/releases/r2/06-repositories-and-test-doubles) method. It compares `item.purity.karat == karat` as integers. The handler passes the parameters through and converts the result to schemas. Filtering, sorting, and limiting are the repository's job; the handler's job is HTTP.

::: tip Keep handlers thin
A handler parses, calls one domain or repository function, and maps the result. If a handler grows a `for` loop with business logic in it, that logic belongs in `catalog.py` or `pricing.py`, where a unit test can reach it without HTTP.
:::

## Check the contract

```bash
curl -s http://127.0.0.1:8000/openapi.json | python3 -c "import json,sys; print(list(json.load(sys.stdin)['paths']))"
```

```text
['/health', '/api/catalog/items', '/api/catalog/items/{sku}']
```

Open `/docs`. `GET /api/catalog/items` shows `karat` and `limit` with their descriptions and bounds; `GET /api/catalog/items/{sku}` shows the path parameter. All of it came from the signatures.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `{"items":[]}` after a POST | uvicorn restarted; in-memory catalog is empty | POST again, then GET. R4 makes it persist |
| `404` on `/api/catalog/items/GP-RING-0001` with `{"detail":"Not Found"}` | Route not registered, or a typo in the template | Template must be `/api/catalog/items/{sku}` |
| `500` for an unknown SKU | `UnknownSkuError` unhandled | Expected until the next page |
| `zsh: no matches found` or truncated URL | Unquoted `?` or `&` | Quote the URL |
| `422` on a valid karat | Parameter declared `int` but the query sent `22.0` | Send an integer |
| Every item returned regardless of `karat` | Filter compared string to int | The repository compares `item.purity.karat == karat`; check the parameter type is `int` |

## Practice

<LessonQuiz
  question="GET /api/catalog/items?karat=18 when no 18K items exist. What is the correct response?"
  a="404 Not Found, because nothing matched"
  b="200 OK with an empty items list"
  c="204 No Content"
  d="422, because 18 is not a supported filter"
  correct="b"
>

The collection resource exists and the filter is valid; the result set has no rows. `404` belongs to `GET /api/catalog/items/{sku}` for a SKU that does not exist. `18` is a supported karat, so `422` would be wrong even if the filter were strict.

</LessonQuiz>

Next: [Errors and problem details](04-errors-and-problem-details), which turns two 500s and the default 422 into one error shape.

<EvidenceCard
  command="curl -s 'http://127.0.0.1:8000/api/catalog/items?karat=22&limit=20'"
  artifact="GET by SKU and GET list with karat and bounded limit; three paths in /openapi.json"
  invariant="Karat filter is an integer match through the repository; every list is bounded"
/>
