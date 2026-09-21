---
id: r4-05
title: "A PostgreSQL catalog adapter"
release: r4
order: 5
prerequisites: [r4-04]
outcomes:
  - Implement CatalogRepository on a Session, mapping rows to domain objects and back
  - Give every request one session that commits on success and rolls back on error
  - Choose the adapter from DATABASE_URL so tests/http keeps using the in-memory fake
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory lead"
  problem="POST /api/catalog/items writes to a Python dict. Restart uvicorn and the Sajilo ring is gone. The R2 port was designed for this moment and nothing has used it yet."
  destination="PostgresCatalog satisfies CatalogRepository. With DATABASE_URL set, uvicorn stores catalog items in PostgreSQL and they survive a restart; without it, everything works as before. tests/http does not change."
/>

# A PostgreSQL catalog adapter

In R2 you wrote a port, `CatalogRepository`, and one adapter, `InMemoryCatalog`. In R3 the routes asked for the port through `Depends(get_catalog)`. This page writes the second adapter and teaches the one FastAPI pattern a database needs: a session per request.

## See the idea first

The port, from `src/gold_pasal/catalog.py`:

```python
class CatalogRepository(Protocol):
    def add(self, item: CatalogItem) -> None: ...

    def get(self, sku: str) -> CatalogItem: ...

    def list_items(self, *, karat: int | None = None, limit: int = 20) -> list[CatalogItem]: ...
```

Three methods. A class with those three methods that talks to PostgreSQL is the whole job.

## The adapter

Create `src/gold_pasal/postgres.py`:

```python
"""PostgreSQL adapters for the catalog and inventory ports."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from gold_pasal.catalog import CatalogItem
from gold_pasal.domain import Purity, Weight
from gold_pasal.errors import DuplicateSkuError, UnknownSkuError
from gold_pasal.orm import CatalogItemRow


class PostgresCatalog:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, item: CatalogItem) -> None:
        if self._session.get(CatalogItemRow, item.sku) is not None:
            raise DuplicateSkuError(item.sku)
        self._session.add(
            CatalogItemRow(
                sku=item.sku,
                name=item.name,
                metal=item.metal,
                karat=item.purity.karat,
                weight_grams=item.weight.grams,
            )
        )
        self._session.flush()

    def get(self, sku: str) -> CatalogItem:
        row = self._session.get(CatalogItemRow, sku)
        if row is None:
            raise UnknownSkuError(sku)
        return _to_catalog_item(row)

    def list_items(self, *, karat: int | None = None, limit: int = 20) -> list[CatalogItem]:
        statement = select(CatalogItemRow).order_by(CatalogItemRow.sku).limit(limit)
        if karat is not None:
            statement = statement.where(CatalogItemRow.karat == karat)
        return [_to_catalog_item(row) for row in self._session.scalars(statement)]


def _to_catalog_item(row: CatalogItemRow) -> CatalogItem:
    return CatalogItem(
        sku=row.sku,
        name=row.name,
        metal=row.metal,
        weight=Weight(row.weight_grams),
        purity=Purity(row.karat),
    )
```

### What to notice

The adapter takes a `Session` and never opens or commits one. Whoever created the session owns the transaction; the adapter only does work inside it. That is what lets one request write a catalog item and, later, an audit event in the same transaction.

`add` checks for a duplicate with `session.get` and raises the same `DuplicateSkuError` the fake raises, so the R3 problem handler works unchanged. Then `flush()` sends the `INSERT` immediately: if a constraint rejects it, the error surfaces here, in the method that caused it, not at commit time somewhere else.

`list_items` builds the `SELECT` the SQL page showed: `ORDER BY sku LIMIT n`, with `WHERE karat = ?` added only when a filter was given. `order_by` matters: without it PostgreSQL returns rows in whatever order is convenient, and a paginated list would repeat or skip items.

`_to_catalog_item` is the only place a `CatalogItemRow` becomes a `CatalogItem`. `Weight(row.weight_grams)` and `Purity(row.karat)` run their validation on the way out, so a row someone edited by hand to karat 19 raises at read time instead of pricing silently.

pyright checks the adapter against the Protocol at every call site that passes it as a `CatalogRepository`; a wrong signature is a type error, not a runtime surprise.

## A session per request

The catalog dependency from R3 returned `request.app.state.catalog`. Now it needs a session when there is a database. Rewrite `src/gold_pasal/api/dependencies.py`:

```python
"""Things routes ask for with Depends()."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from gold_pasal.catalog import CatalogRepository
from gold_pasal.postgres import PostgresCatalog


def get_session(request: Request) -> Iterator[Session | None]:
    """One database session per request; commit on success, roll back on any error."""
    factory = request.app.state.session_factory
    if factory is None:
        yield None
        return
    with factory() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


DbSession = Annotated[Session | None, Depends(get_session)]


def get_catalog(request: Request, session: DbSession) -> CatalogRepository:
    if session is not None:
        return PostgresCatalog(session)
    catalog: CatalogRepository = request.app.state.catalog
    return catalog
```

`get_session` is a dependency with `yield` (a generator, from [R1](/releases/r1/05-generators-files-and-decorators)). FastAPI runs the code before `yield` when a request arrives, hands the session to the route, and runs the code after `yield` when the route finishes. If the route returned, `commit()`. If it raised, `rollback()` and re-raise so the problem handlers still run. One request, one transaction, one decision.

When the app has no `session_factory`, the dependency yields `None` and `get_catalog` falls back to the in-memory adapter on `app.state`. That keeps every existing test and the R3 curls working.

FastAPI caches a dependency's value within one request, so a route that asks for the catalog and, on the next page, the inventory gets the same session in both. Two adapters, one transaction.

## Choose the adapter by environment

Update `src/gold_pasal/api/app.py`:

```python
"""Build the FastAPI application. `app` is what uvicorn serves."""

from fastapi import FastAPI
from sqlalchemy.orm import Session, sessionmaker

from gold_pasal import __version__
from gold_pasal.api.catalog import router as catalog_router
from gold_pasal.api.problems import register_problem_handlers
from gold_pasal.api.schemas import Health
from gold_pasal.catalog import CatalogRepository, InMemoryCatalog
from gold_pasal.db import database_url_from_env, make_engine, make_session_factory

SERVICE_NAME = "gold-pasal"


def create_app(
    *,
    session_factory: sessionmaker[Session] | None = None,
    catalog: CatalogRepository | None = None,
) -> FastAPI:
    """With a session factory, every request talks to PostgreSQL. Without one, memory."""
    app = FastAPI(title="Gold Pasal", version=__version__)
    app.state.session_factory = session_factory
    app.state.catalog = catalog if catalog is not None else InMemoryCatalog()

    @app.get("/health", response_model=Health, tags=["ops"])
    def health() -> Health:
        return Health(service=SERVICE_NAME, status="ok")

    app.include_router(catalog_router)
    register_problem_handlers(app)
    return app


def app_from_env() -> FastAPI:
    """What uvicorn runs: PostgreSQL when DATABASE_URL is set, memory otherwise."""
    url = database_url_from_env()
    if url is None:
        return create_app()
    return create_app(session_factory=make_session_factory(make_engine(url)))


app = app_from_env()
```

`create_app` gained a `session_factory` parameter and still defaults to memory. `app_from_env` is the one function that reads the environment, and `app = app_from_env()` is what uvicorn imports. Tests never call `app_from_env`; they call `create_app(...)` with what they want.

```bash
uv run pytest tests/http -q
```

```text
.........                                                                [100%]
9 passed in 0.12s
```

Unchanged: the HTTP tests build `create_app()` with no factory and get the fake.

## Persist through a restart

With the database running and migrated:

```bash
export DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal
uv run uvicorn gold_pasal.api.app:app --port 8000
```

In a second terminal:

```bash
curl -s -X POST http://127.0.0.1:8000/api/catalog/items \
  -H "content-type: application/json" \
  -d '{"sku":"GP-RING-DB01","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}'
```

```text
{"sku":"GP-RING-DB01","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.2000"}
```

`5.2000`: the row came back through `NUMERIC(12, 4)`. Now `Ctrl-C` uvicorn, start it again, and:

```bash
curl -s http://127.0.0.1:8000/api/catalog/items/GP-RING-DB01
```

The ring is still there. In psql, `SELECT sku, karat FROM catalog_items;` shows the same row. The in-memory catalog could never do this; the second uvicorn process is a stranger to the first.

Without `DATABASE_URL` exported, the same command serves from memory, exactly as in R3.

::: tip Two adapters, one contract
`InMemoryCatalog` stays. It is the fast, deterministic adapter for `tests/http` and for the unit tests, and it is also what runs when someone starts the API on a laptop with no database. The Postgres adapter is for the real store. Both pass the same tests against the port's behavior, which is how you know they agree.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `AttributeError: 'State' object has no attribute 'session_factory'` | `create_app` did not set it | Assign `app.state.session_factory` even when `None` |
| `ProgrammingError: relation "catalog_items" does not exist` | Migrations not applied | `uv run alembic upgrade head` |
| pyright: `"PostgresCatalog" is incompatible with protocol "CatalogRepository"` | A method signature drifted | Match the Protocol exactly, including keyword-only parameters |
| Items appear during a request and are gone after | Missing `commit()` in `get_session` | Commit after `yield` |
| A failed request leaves a half-written row | Exception path does not roll back | `except Exception: session.rollback(); raise` |
| `tests/http` starts needing a database | A test called `app_from_env()` | Tests call `create_app()` |

## Practice

<LessonQuiz
  question="A route adds a catalog item, then raises UnknownSkuError while reading another. What is in the database afterwards?"
  a="The new item; add() flushed it"
  b="Nothing new; get_session rolled the transaction back when the route raised"
  c="A half-written row"
  d="It depends on the pool size"
  correct="b"
>

`flush` sent the INSERT inside the open transaction, but only `commit` makes it permanent. The exception travelled through `get_session`, which called `rollback()`. One request, one transaction: all of it or none of it.

</LessonQuiz>

Next: [Stock items and holds in a transaction](06-stock-items-and-holds-in-a-transaction), the inventory tables get their domain, adapter, and routes.

<EvidenceCard
  command="curl -s http://127.0.0.1:8000/api/catalog/items/GP-RING-DB01"
  artifact="postgres.py with PostgresCatalog; get_session dependency; create_app(session_factory=...); a catalog item that survives a restart"
  invariant="Routes depend on the CatalogRepository port; the adapter is chosen once, by DATABASE_URL"
/>
