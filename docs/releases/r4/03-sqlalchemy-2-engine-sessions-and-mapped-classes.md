---
id: r4-03
title: "SQLAlchemy 2: engine, sessions, and mapped classes"
release: r4
order: 3
prerequisites: [r4-02]
outcomes:
  - Create an engine and a session factory from DATABASE_URL
  - Map catalog_items, stock_items, and holds to classes with Mapped and mapped_column
  - Add, get, select, update, and catch IntegrityError through a session
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory lead"
  problem="You can type SQL now. The application cannot: it has Python objects and needs rows, and a string-concatenated INSERT is how catalogs get corrupted."
  destination="src/gold_pasal/db.py builds engines and sessions; src/gold_pasal/orm.py maps three tables to three classes; you have read and written rows from the REPL."
/>

# SQLAlchemy 2: engine, sessions, and mapped classes

**SQLAlchemy** is the library that connects Python to SQL databases. It has two layers: **Core** (an `Engine`, connections, and SQL expressions built from Python) and the **ORM** (classes mapped to tables, and a `Session` that tracks objects and turns your changes into `INSERT` and `UPDATE`). This shop uses both: Core for the plumbing, the ORM for rows.

## See the idea first

From `gold-pasal`:

```bash
uv add sqlalchemy "psycopg[binary]"
export DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal
uv run python
```

```python
>>> import os
>>> from sqlalchemy import create_engine, text
>>> engine = create_engine(os.environ["DATABASE_URL"])
>>> with engine.connect() as connection:
...     connection.execute(text("SELECT 22 / 24.0")).scalar()
...
Decimal('0.91666666666666666667')
```

`create_engine` reads the URL and knows how to open connections. `text(...)` wraps raw SQL. `.scalar()` returns the first column of the first row. The database did the division and psycopg handed back a `Decimal`.

`psycopg` is the driver, the code that speaks PostgreSQL's wire protocol. `[binary]` installs a prebuilt version so nothing compiles on your laptop.

## Engine and sessions

Create `src/gold_pasal/db.py`:

```python
"""Engine, session factory, and the ORM base class. No table definitions here."""

import os

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Every mapped table inherits from this; Alembic reads Base.metadata."""


def database_url_from_env() -> str | None:
    """DATABASE_URL, or None when the process should run without a database."""
    return os.environ.get("DATABASE_URL")


def make_engine(url: str) -> Engine:
    return create_engine(url, pool_pre_ping=True)


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(engine, expire_on_commit=False)
```

| Piece | Job | How many |
| --- | --- | --- |
| `Engine` | owns a pool of connections to one database | one per process |
| `sessionmaker` | a factory that produces sessions bound to the engine | one per process |
| `Session` | one unit of work: a transaction, and the objects loaded in it | one per request |

`pool_pre_ping=True` checks a pooled connection is alive before using it, so a database restart does not surface as one confusing error. `expire_on_commit=False` lets you read an object's attributes after `commit()` without a second query, which the API relies on when it builds a response after saving.

`Base` is the class every mapped table inherits from. It collects the tables into `Base.metadata`, which is what Alembic compares against the live database on the next page.

## Mapped classes

A **mapped class** is a Python class that stands for a table. Create `src/gold_pasal/orm.py`:

```python
"""SQLAlchemy mapped classes: one class per table. Domain objects live elsewhere."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from gold_pasal.db import Base


class CatalogItemRow(Base):
    __tablename__ = "catalog_items"

    sku: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    metal: Mapped[str] = mapped_column(String(20))
    karat: Mapped[int]
    weight_grams: Mapped[Decimal] = mapped_column(Numeric(12, 4))


class StockItemRow(Base):
    __tablename__ = "stock_items"

    stock_item_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    sku: Mapped[str] = mapped_column(String(40))


class HoldRow(Base):
    __tablename__ = "holds"

    hold_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    stock_item_id: Mapped[str] = mapped_column(ForeignKey("stock_items.stock_item_id"))
    status: Mapped[str] = mapped_column(String(10))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
```

### Reading a mapping

`Mapped[str]` declares the Python type of the column; SQLAlchemy infers the SQL type (`str` becomes `VARCHAR`, `int` becomes `INTEGER`, `Decimal` needs an explicit `Numeric`). `mapped_column(...)` adds what the annotation cannot say: length, primary key, foreign key, timezone. A column that needs nothing extra, like `karat`, is just the annotation. `Mapped[str]` means `NOT NULL`; `Mapped[str | None]` would allow null.

These are the tables from the [SQL page](02-sql-essentials-on-the-tray) with the CHECK constraints left to Python: `Purity` and `Weight` validate before a row is ever built, and the adapter on page 5 only constructs rows from validated domain objects. The `REFERENCES` became `ForeignKey(...)`. The partial unique index is deliberately missing; page 7 adds it when you have seen why.

### Rows are not domain objects

`CatalogItemRow` has a `karat: int` and a `weight_grams: Decimal`. `CatalogItem` from R2 has a `Purity` and a `Weight`. The `Row` suffix marks the difference: rows are the database's shape, domain objects are the shop's. The adapter on page 5 converts one to the other, in both directions, in one place. Routes, tests, and pricing never see a `Row`.

## Rows from the REPL

Until Alembic exists, let SQLAlchemy create the tables from the metadata so you can try the session. From `gold-pasal`, `uv run python`:

```python
>>> import os
>>> from decimal import Decimal
>>> from gold_pasal.db import Base, make_engine, make_session_factory
>>> from gold_pasal.orm import CatalogItemRow, StockItemRow
>>> engine = make_engine(os.environ["DATABASE_URL"])
>>> Base.metadata.create_all(engine)
>>> SessionFactory = make_session_factory(engine)
```

`create_all` issued the three `CREATE TABLE` statements. Insert:

```python
>>> with SessionFactory() as session:
...     session.add(StockItemRow(stock_item_id="GP-N-0001", sku="GP-NECKLACE-0001"))
...     session.add(StockItemRow(stock_item_id="GP-R-0001", sku="GP-RING-0001"))
...     session.commit()
...
```

`session.add` registers the object; nothing is sent yet. `commit()` flushes the pending `INSERT`s and commits the transaction. The `with` block closes the session either way.

Read:

```python
>>> from sqlalchemy import select
>>> with SessionFactory() as session:
...     row = session.get(StockItemRow, "GP-R-0001")
...     print(row.sku)
...     rows = session.scalars(select(StockItemRow).order_by(StockItemRow.sku)).all()
...     print([r.stock_item_id for r in rows])
...
GP-RING-0001
['GP-N-0001', 'GP-R-0001']
```

`session.get(Class, primary_key)` is the one-row lookup. `select(Class).where(...).order_by(...)` builds a query; `session.scalars(...)` runs it and yields mapped objects. Print a statement to see the SQL it stands for:

```python
>>> print(select(StockItemRow).where(StockItemRow.sku == "GP-RING-0001"))
SELECT stock_items.stock_item_id, stock_items.sku
FROM stock_items
WHERE stock_items.sku = :sku_1
```

`:sku_1` is a bound parameter. The value travels separately from the SQL text, so a SKU containing a quote mark cannot change the query. That is the whole defence against SQL injection, and you get it by never building SQL from f-strings.

Update by assignment:

```python
>>> with SessionFactory() as session:
...     row = session.get(StockItemRow, "GP-R-0001")
...     row.sku = "GP-RING-0001-RESIZED"
...     session.commit()
...
```

The session noticed the attribute change and emitted an `UPDATE ... WHERE stock_item_id = ...` on commit. No SQL written.

### IntegrityError

```python
>>> from sqlalchemy.exc import IntegrityError
>>> with SessionFactory() as session:
...     session.add(StockItemRow(stock_item_id="GP-R-0001", sku="dup"))
...     try:
...         session.flush()
...     except IntegrityError as exc:
...         print(type(exc).__name__, str(exc).splitlines()[0][:70])
...         session.rollback()
...
IntegrityError (psycopg.errors.UniqueViolation) duplicate key value violates un
```

`flush()` sends pending statements without committing, so you can catch the database's answer inside the transaction. Every constraint from the SQL page arrives in Python as `IntegrityError`; the adapter on page 7 turns one specific case into `ReservationConflictError`. After any error the session must `rollback()` before it can be used again.

Drop the scratch tables so the next page can create them properly:

```python
>>> Base.metadata.drop_all(engine)
```

`create_all` and `drop_all` are fine for an experiment. They are not how the schema evolves: `create_all` cannot add a column to an existing table or rename one, and it has no history. That is Alembic's job, next.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `KeyError: 'DATABASE_URL'` | Not exported in this shell | `export DATABASE_URL=...`, or prefix the command |
| `OperationalError: connection ... refused` | Database not running | `docker compose up -d db` |
| `ModuleNotFoundError: psycopg` | Driver not installed | `uv add "psycopg[binary]"` |
| `ArgumentError: Mapper ... could not assemble any primary key` | A class without `primary_key=True` | Every table needs one |
| `DetachedInstanceError` | Read an attribute after the session closed, with `expire_on_commit=True` | Keep `expire_on_commit=False`, or read inside the `with` |
| `InvalidRequestError: This Session's transaction has been rolled back` | Used the session after an error without `rollback()` | Roll back, then continue |
| pyright: `"int" is not assignable to "Mapped[int]"` | Assigned a plain value in a class body without `mapped_column` | Annotate as `Mapped[int]`; defaults go inside `mapped_column(default=...)` |

## Practice

<LessonQuiz
  question="You write session.add(row) and then read the table from psql in another terminal. The row is not there. Why?"
  a="add() is asynchronous and has not finished"
  b="Nothing is sent until flush() or commit(), and nothing is visible to other connections until commit()"
  c="psql caches the previous result"
  d="The engine has no connection pool"
  correct="b"
>

`add` only registers the object with the session. `flush` sends the INSERT inside the open transaction; `commit` makes it visible to everyone else. Until then another connection sees the table as it was, which is the isolation the SQL page showed with two psql sessions.

</LessonQuiz>

Next: [Alembic migrations](04-alembic-migrations), which owns `CREATE TABLE` from here on.

<EvidenceCard
  command="uv run python -c 'from gold_pasal.orm import CatalogItemRow, StockItemRow, HoldRow; print(HoldRow.__table__)'"
  artifact="db.py with Base, make_engine, make_session_factory; orm.py with three mapped classes"
  invariant="Every SQL statement the application sends is built by SQLAlchemy with bound parameters"
/>
