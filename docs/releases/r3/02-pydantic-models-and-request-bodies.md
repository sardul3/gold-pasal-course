---
id: r3-02
title: "Pydantic models and request bodies"
release: r3
order: 2
prerequisites: [r3-01]
outcomes:
  - Define request and response models with pydantic BaseModel and Field
  - Accept a JSON body on POST /api/catalog/items and return 201
  - Keep HTTP schemas separate from domain objects and map between them
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="Sita's tablet will send a ring as JSON: a SKU, a name, a karat, grams as text. Some of it will be wrong: a lowercase SKU, weight typed as 'heavy', an extra field from an old app version."
  destination="POST /api/catalog/items parses and validates the body with a Pydantic model, builds a CatalogItem, and returns 201 with the stored item as JSON."
/>

# Pydantic models and request bodies

**Pydantic** is the library FastAPI uses to turn JSON into typed Python objects and back. A **model** is a class with annotated fields; Pydantic validates incoming data against it and rejects what does not fit. The API has two kinds of shapes: what it accepts (`ItemCreate`) and what it returns (`ItemRead`). Neither is the domain `CatalogItem`, and this page is about keeping them apart.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from decimal import Decimal
>>> from pydantic import BaseModel
>>> class Ring(BaseModel):
...     sku: str
...     karat: int
...     weight_grams: Decimal
...
>>> Ring.model_validate({"sku": "GP-RING-0001", "karat": "22", "weight_grams": "5.20"})
Ring(sku='GP-RING-0001', karat=22, weight_grams=Decimal('5.20'))
```

Pydantic read a dict of strings and produced an `int` and a `Decimal`, because the annotations said so. Pass `"karat": "22K"` and it raises `ValidationError` with the field name and reason. That is the whole job: untrusted data in, typed object out, or a precise error.

## Schemas for the catalog

Create `src/gold_pasal/api/schemas.py`:

```python
"""Pydantic models: the JSON shapes the API accepts and returns."""

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from gold_pasal.catalog import CatalogItem


class ItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(min_length=3, max_length=40, pattern=r"^[A-Z0-9-]+$")
    name: str = Field(min_length=1, max_length=120)
    metal: Literal["gold"] = "gold"
    karat: int = Field(description="one of 14, 18, 22, 24")
    weight_grams: Decimal = Field(gt=0, decimal_places=4, description="grams, as a string")


class ItemRead(BaseModel):
    sku: str
    name: str
    metal: str
    karat: int
    weight_grams: Decimal

    @classmethod
    def from_domain(cls, item: CatalogItem) -> "ItemRead":
        return cls(
            sku=item.sku,
            name=item.name,
            metal=item.metal,
            karat=item.purity.karat,
            weight_grams=item.weight.grams,
        )


class ItemList(BaseModel):
    items: list[ItemRead]


class Health(BaseModel):
    service: str
    status: Literal["ok"]
```

### Field constraints

`Field(...)` attaches rules and documentation to one field:

| Constraint | Rejects |
| --- | --- |
| `min_length`, `max_length` | strings outside the range |
| `pattern=r"^[A-Z0-9-]+$"` | SKUs with lowercase, spaces, or punctuation |
| `gt=0` | zero or negative grams |
| `decimal_places=4` | a weight with more precision than the scale has |
| `Literal["gold"]` | any metal but gold, until the shop sells silver |
| `description` | nothing; it goes into `/docs` |

`karat: int` has no `Literal[14, 18, 22, 24]` on purpose. Pydantic would reject 19 with a generic message; the [next-but-one page](04-errors-and-problem-details) wants the domain's `UnsupportedKaratError` and its message to reach the client instead. The schema checks shape; the domain checks business rules.

### extra="forbid"

By default Pydantic ignores unknown keys. `ConfigDict(extra="forbid")` rejects them, so a tablet sending `"colour": "red"` gets an error instead of silently losing the field. For an API that stores what it is sent, silent loss is the worse failure.

### Decimal on the wire

`weight_grams: Decimal` accepts `"5.20"` (a JSON string) or `5.2` (a JSON number). Send the string. Pydantic serializes a Decimal back out as a string, so the response carries `"5.20"` and no client ever sees `5.199999`. This is the [R1 JSON rule](/releases/r1/05-generators-files-and-decorators) applied at the API boundary.

## Try the models in the REPL

```python
>>> from gold_pasal.api.schemas import ItemCreate
>>> body = ItemCreate.model_validate(
...     {"sku": "GP-RING-0001", "name": "Sajilo 22K Ring", "karat": 22, "weight_grams": "5.20"}
... )
>>> body
ItemCreate(sku='GP-RING-0001', name='Sajilo 22K Ring', metal='gold', karat=22, weight_grams=Decimal('5.20'))
>>> body.model_dump_json()
'{"sku":"GP-RING-0001","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}'
```

`metal` filled in from its default. `model_dump()` gives a dict; `model_dump_json()` gives the JSON text with the Decimal as a string.

Now the rejections:

```python
>>> from pydantic import ValidationError
>>> bad = {"sku": "ring 1", "name": "x", "karat": 22, "weight_grams": "heavy", "colour": "red"}
>>> try:
...     ItemCreate.model_validate(bad)
... except ValidationError as exc:
...     for error in exc.errors():
...         print(error["loc"], error["msg"])
...
('sku',) String should match pattern '^[A-Z0-9-]+$'
('weight_grams',) Input should be a valid decimal
('colour',) Extra inputs are not permitted
```

One `ValidationError` carries every problem, each with a location and a message. FastAPI turns this into a `422` response automatically.

## Accept a body on POST

In `src/gold_pasal/api/app.py`, add the imports and the route. The catalog is a module-level `InMemoryCatalog` for now; the [dependency injection page](05-dependency-injection-and-routers) replaces that.

```python
from fastapi import FastAPI, status

from gold_pasal import __version__
from gold_pasal.api.schemas import Health, ItemCreate, ItemRead
from gold_pasal.catalog import CatalogItem, InMemoryCatalog
from gold_pasal.domain import Purity, Weight

SERVICE_NAME = "gold-pasal"

app = FastAPI(title="Gold Pasal", version=__version__)
catalog = InMemoryCatalog()


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(service=SERVICE_NAME, status="ok")


@app.post("/api/catalog/items", status_code=status.HTTP_201_CREATED, response_model=ItemRead)
def create_item(body: ItemCreate) -> ItemRead:
    item = CatalogItem(
        sku=body.sku,
        name=body.name,
        metal=body.metal,
        weight=Weight(body.weight_grams),
        purity=Purity(body.karat),
    )
    catalog.add(item)
    return ItemRead.from_domain(item)
```

Read `create_item`. The parameter `body: ItemCreate` tells FastAPI to parse the request body as that model; if parsing fails, the handler never runs. Inside, the schema becomes a domain `CatalogItem` (`Weight` and `Purity` validate the business rules), the item goes into the catalog, and the domain object is mapped back to `ItemRead` for the response. `status_code=201` sets the success status; `response_model=ItemRead` documents and validates the output.

`health` now returns a model too. The behavior is identical; the contract in `/docs` gained a named `Health` schema.

Restart uvicorn (or let `--reload` do it) and post a ring:

```bash
curl -s -i -X POST http://127.0.0.1:8000/api/catalog/items \
  -H "content-type: application/json" \
  -d '{"sku":"GP-RING-0001","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}'
```

```text
HTTP/1.1 201 Created
content-type: application/json

{"sku":"GP-RING-0001","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}
```

`-H` sets a request header; `content-type: application/json` tells the server how to read `-d`, the body. The backslashes continue the command across lines.

Send it again with `"weight_grams": "heavy"`:

```text
HTTP/1.1 422 Unprocessable Entity
content-type: application/json

{"detail":[{"type":"decimal_parsing","loc":["body","weight_grams"],"msg":"Input should be a valid decimal","input":"heavy"}]}
```

Pydantic's error, wrapped by FastAPI. Accurate, and not yet in the shape the shop's contract wants; page 4 fixes the shape.

Send `"karat": 19`:

```text
HTTP/1.1 500 Internal Server Error
```

The schema accepted 19 (it is an `int`), `Purity(19)` raised `UnsupportedKaratError`, and nothing caught it. The uvicorn terminal shows the traceback. A 500 is always a bug; here the bug is a missing handler, and page 4 adds it.

## Schemas are not domain objects

| | `ItemCreate` / `ItemRead` | `CatalogItem` |
| --- | --- | --- |
| lives in | `api/schemas.py` | `catalog.py` |
| knows about | JSON, field names on the wire, string patterns | `Weight`, `Purity`, business rules |
| changes when | a client needs a new field or an old one renamed | the shop's rules change |
| validated by | Pydantic at the HTTP edge | `__post_init__` at construction |

Two classes with similar fields feel like duplication. They are two contracts with two owners. When R4 adds a database row for the same item, that will be a third shape, mapped in the adapter. `ItemRead.from_domain` is the one place the API learns how a `CatalogItem` looks in JSON.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `422` with `"loc":["body"]` and `"msg":"Field required"` | Body missing or not JSON | Send `-d` with `-H "content-type: application/json"` |
| `422` `Extra inputs are not permitted` | A key the schema does not know | Remove it, or add the field if the shop needs it |
| `422` `String should match pattern` | Lowercase or spaces in the SKU | `GP-RING-0001` style |
| `500` for karat 19 | Domain exception unhandled | Expected until the [problem details page](04-errors-and-problem-details) |
| `weight_grams` comes back as `5.2` | Pydantic given a float, or serialized as a number | Send a string; keep the field typed `Decimal` |
| `ModuleNotFoundError: pydantic` | FastAPI not installed | `uv add fastapi uvicorn` |

## Practice

<LessonQuiz
  question="ItemCreate declares karat: int, not Literal[14, 18, 22, 24]. A body with karat 19 passes the schema. Where is 19 rejected?"
  a="Nowhere; 19 is stored"
  b="In Purity.__post_init__, when create_item builds the CatalogItem"
  c="In ItemRead.from_domain"
  d="By uvicorn before the handler runs"
  correct="b"
>

The schema checks the shape (an integer). The domain checks the rule (one of four stamps). `Purity(19)` raises `UnsupportedKaratError`; right now that becomes a 500, and page 4 turns it into a 422 problem document with the domain's own message.

</LessonQuiz>

Next: [Path and query parameters](03-path-and-query-parameters), so the tablet can find the ring again.

<EvidenceCard
  command="curl -s -i -X POST http://127.0.0.1:8000/api/catalog/items with the Sajilo ring body"
  artifact="api/schemas.py with ItemCreate, ItemRead, ItemList, Health; POST returning 201"
  invariant="The API stores only bodies the schema accepts and the domain validates; grams travel as strings"
/>
