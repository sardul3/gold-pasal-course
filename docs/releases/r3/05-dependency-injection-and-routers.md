---
id: r3-05
title: "Dependency injection and routers"
release: r3
order: 5
prerequisites: [r3-04]
outcomes:
  - Provide the repository to routes with Depends instead of a module-level global
  - Split routes into an APIRouter and build the app with a create_app factory
  - Swap the catalog for a test with create_app(catalog=...) or dependency_overrides
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="app.py holds a global catalog = InMemoryCatalog(). Every test shares it, so a ring posted by one test appears in another. R4 needs to hand the same routes a PostgreSQL repository, and a global cannot be swapped."
  destination="Routes ask for a CatalogRepository with Depends. create_app(catalog=None) builds an app around any repository. Catalog routes live in their own module and are included with one line."
/>

# Dependency injection and routers

**Dependency injection** means a function receives the things it needs as parameters instead of reaching for globals. You did it in R2: `quote_sku(sku, catalog, ...)` takes the repository. FastAPI has a built-in way to do the same for route handlers: `Depends`. This page rewires the API so the catalog is injected, then splits `app.py` into a factory and a router.

## See the idea first

The problem, in `src/gold_pasal/api/app.py` as it stands:

```python
catalog = InMemoryCatalog()   # one dict for the whole process, and for every test
```

The fix is one dependency function. Create `src/gold_pasal/api/dependencies.py`:

```python
"""Things routes ask for with Depends()."""

from fastapi import Request

from gold_pasal.catalog import CatalogRepository


def get_catalog(request: Request) -> CatalogRepository:
    catalog: CatalogRepository = request.app.state.catalog
    return catalog
```

A route that wants the catalog declares it:

```python
from typing import Annotated

from fastapi import Depends

Catalog = Annotated[CatalogRepository, Depends(get_catalog)]


@router.get("/items/{sku}", response_model=ItemRead)
def read_item(sku: str, catalog: Catalog) -> ItemRead:
    return ItemRead.from_domain(catalog.get(sku))
```

FastAPI sees `Depends(get_catalog)`, calls `get_catalog(request)`, and passes the result in as `catalog`. The handler never imports a global.

## Depends

`Depends(fn)` tells FastAPI: before running this handler, call `fn` and give me its return value. `fn` can itself take `Request`, other `Depends`, or nothing. Dependencies are resolved per request and cached within it, so two parameters depending on `get_catalog` in one handler share one call.

`Annotated[CatalogRepository, Depends(get_catalog)]` bundles the type and the dependency into one alias, `Catalog`, so every handler writes `catalog: Catalog`. The type is the R2 Protocol, not `InMemoryCatalog`; handlers do not know which adapter they got.

`request.app.state` is a namespace FastAPI gives you for per-application objects. The factory below puts the repository there when the app is built.

## A router for the catalog

An **APIRouter** groups routes so they can live in their own file and be attached to the app in one call. Create `src/gold_pasal/api/catalog.py` and move the three catalog routes into it:

```python
"""Catalog routes: create, read, and list items."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from gold_pasal.api.dependencies import get_catalog
from gold_pasal.api.schemas import ItemCreate, ItemList, ItemRead
from gold_pasal.catalog import CatalogItem, CatalogRepository
from gold_pasal.domain import Purity, Weight

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

Catalog = Annotated[CatalogRepository, Depends(get_catalog)]


@router.post("/items", status_code=status.HTTP_201_CREATED, response_model=ItemRead)
def create_item(body: ItemCreate, catalog: Catalog) -> ItemRead:
    item = CatalogItem(
        sku=body.sku,
        name=body.name,
        metal=body.metal,
        weight=Weight(body.weight_grams),
        purity=Purity(body.karat),
    )
    catalog.add(item)
    return ItemRead.from_domain(item)


@router.get("/items", response_model=ItemList)
def list_items(
    catalog: Catalog,
    karat: Annotated[int | None, Query(description="14, 18, 22, or 24")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ItemList:
    items = catalog.list_items(karat=karat, limit=limit)
    return ItemList(items=[ItemRead.from_domain(item) for item in items])


@router.get("/items/{sku}", response_model=ItemRead)
def read_item(sku: str, catalog: Catalog) -> ItemRead:
    return ItemRead.from_domain(catalog.get(sku))
```

`prefix="/api/catalog"` is prepended to every path in the file, so `"/items"` becomes `/api/catalog/items`. `tags=["catalog"]` groups them under one heading in `/docs`. The handler bodies did not change; `catalog: Catalog` replaced the global.

In `list_items`, `catalog` comes before the query parameters because parameters without defaults must precede ones with defaults; that is a Python rule, not a FastAPI one.

## The factory

Rewrite `src/gold_pasal/api/app.py`:

```python
"""Build the FastAPI application. `app` is what uvicorn serves."""

from fastapi import FastAPI

from gold_pasal import __version__
from gold_pasal.api.catalog import router as catalog_router
from gold_pasal.api.problems import register_problem_handlers
from gold_pasal.api.schemas import Health
from gold_pasal.catalog import CatalogRepository, InMemoryCatalog

SERVICE_NAME = "gold-pasal"


def create_app(catalog: CatalogRepository | None = None) -> FastAPI:
    app = FastAPI(title="Gold Pasal", version=__version__)
    app.state.catalog = catalog if catalog is not None else InMemoryCatalog()

    @app.get("/health", response_model=Health, tags=["ops"])
    def health() -> Health:
        return Health(service=SERVICE_NAME, status="ok")

    app.include_router(catalog_router)
    register_problem_handlers(app)
    return app


app = create_app()
```

`create_app` builds a fresh application every time it is called: a new `FastAPI`, the given repository (or a new empty in-memory one) on `app.state`, the health route, the catalog router, the error handlers. `app = create_app()` at the bottom is what `uvicorn gold_pasal.api.app:app` serves, so the command from page 1 is unchanged.

Restart uvicorn and repeat the POST and GET from earlier pages. Same responses. `/docs` now shows two groups, `ops` and `catalog`.

## Swap the catalog

The reason for all of this. Two ways, both useful:

```python
>>> from decimal import Decimal
>>> from fastapi.testclient import TestClient
>>> from gold_pasal.api.app import create_app
>>> from gold_pasal.catalog import CatalogItem, InMemoryCatalog
>>> from gold_pasal.domain import Purity, Weight
>>> ring = CatalogItem("RING-01", "Sajilo 22K Ring", "gold", Weight(Decimal("5.00")), Purity(22))
>>> app = create_app(catalog=InMemoryCatalog({"RING-01": ring}))
>>> with TestClient(app) as client:
...     client.get("/api/catalog/items/RING-01").status_code
...
200
```

The factory took a pre-filled catalog. Every route sees it through `get_catalog`. The next page's test fixture does exactly this to get a clean catalog per test.

The second way overrides the dependency function itself:

```python
>>> from gold_pasal.api.dependencies import get_catalog
>>> app = create_app()
>>> app.dependency_overrides[get_catalog] = lambda: InMemoryCatalog({"RING-01": ring})
>>> with TestClient(app) as client:
...     client.get("/api/catalog/items").json()
...
{'items': [{'sku': 'RING-01', 'name': 'Sajilo 22K Ring', 'metal': 'gold', 'karat': 22, 'weight_grams': '5.00'}]}
```

`dependency_overrides` is a dict on the app: key is the original dependency, value is the replacement. Use it when a dependency is not something the factory takes, or when you want to override one dependency in one test. `TestClient` needs `uv add --group dev httpx2`; the next page explains.

## Why R4 cares

R4 writes a `PostgresCatalog` that satisfies `CatalogRepository`. Production will call `create_app(catalog=PostgresCatalog(engine))`. Not one line in `api/catalog.py` changes, because the routes asked for the Protocol. That is the payoff of the R2 port: the adapter is chosen at the edge, in the factory, once.

::: tip Lifespan for startup and shutdown
When a repository needs to open a connection pool at startup and close it at shutdown, FastAPI's `lifespan` parameter takes an async context manager (the [R1 contextmanager idea](/releases/r1/05-generators-files-and-decorators), asynchronous). R4 uses it. The in-memory catalog needs no setup, so this page does not.
:::

## The API package now

```text
src/gold_pasal/api/
├── __init__.py
├── app.py            create_app factory; `app` for uvicorn
├── catalog.py        APIRouter with the three catalog routes
├── dependencies.py   get_catalog
├── problems.py       problem details handlers
└── schemas.py        ItemCreate, ItemRead, ItemList, Health
```

Each file has one job. R4 adds `inventory.py` next to `catalog.py` and one more `include_router` line in the factory.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `AttributeError: 'State' object has no attribute 'catalog'` | `app.state.catalog` never set | The factory must assign it before any request |
| `404` on `/api/catalog/items` after the split | Router not included, or prefix duplicated in the route paths | `app.include_router(catalog_router)`; routes are `"/items"` under `prefix="/api/catalog"` |
| `TypeError: non-default argument follows default argument` | `catalog: Catalog` after a query param with a default | Put `catalog` first |
| pyright `"InMemoryCatalog" is not assignable to "CatalogRepository"` | Adapter drifted from the Protocol | Match every method signature |
| A test still sees another test's ring | Tests share `app` from `app.py` | Build `create_app()` per test |
| `dependency_overrides` has no effect | Overrode a different function object than the route uses | Import `get_catalog` from `gold_pasal.api.dependencies` in both places |

## Practice

<LessonQuiz
  question="R4 replaces the in-memory catalog with PostgreSQL. Which file changes?"
  a="api/catalog.py, to import the Postgres class"
  b="api/app.py, where the factory chooses the adapter"
  c="api/schemas.py, to add a table name"
  d="Every handler, to open a connection"
  correct="b"
>

Handlers depend on the `CatalogRepository` Protocol through `Depends(get_catalog)`. The concrete adapter is chosen once, in `create_app`. Schemas describe JSON and know nothing about storage.

</LessonQuiz>

Next: [Test the API with HTTPX](06-test-the-api-with-httpx), where `create_app()` per test finally makes the catalog tests independent.

<EvidenceCard
  command="uv run uvicorn gold_pasal.api.app:app --port 8000"
  artifact="api/dependencies.py, api/catalog.py router, create_app factory; same three paths served"
  invariant="Routes depend on the CatalogRepository port; the adapter is chosen in the factory"
/>
