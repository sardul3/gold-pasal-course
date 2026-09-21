---
title: "R4: PostgreSQL, SQLAlchemy, and transactions"
description: "A migrated PostgreSQL schema behind the repository ports, and a hold race that only one customer wins."
---

# R4: PostgreSQL, SQLAlchemy, and transactions

**What you'll have:** the catalog and a new inventory (stock items and holds) stored in PostgreSQL. You will run the database with Docker Compose, write SQL by hand once, map tables with SQLAlchemy 2, version the schema with Alembic, put a PostgreSQL adapter behind the `CatalogRepository` port from R2, and fix a real concurrency bug with a unique constraint instead of a lock.

<LessonMission
  role="inventory lead"
  problem="Two browsers hold the same necklace. The in-memory catalog forgets everything when uvicorn restarts, and a second uvicorn worker has its own copy of every list."
  destination="DATABASE_URL points at PostgreSQL. Alembic owns the schema. POST /api/inventory/holds twice at once on one stock item returns 201 and 409 with type ending /reservation-conflict, and the rows survive a restart."
/>

## Before you start

You finished [R3](/releases/r3/): `uvicorn gold_pasal.api.app:app` serves the catalog, `create_app()` takes a `CatalogRepository`, and `tests/http` is green. Prove it from `gold-pasal`:

```bash
uv run pytest -q | tail -1
uv run python -c "from gold_pasal.api.app import create_app; print(create_app().title)"
```

```text
45 passed in 0.70s
Gold Pasal
```

You also need Docker Desktop (or Docker Engine) installed; the first page confirms it. No SQL knowledge is assumed.

## Guide

| Page | You will be able to |
| --- | --- |
| [Run PostgreSQL with Docker Compose](01-run-postgresql-with-docker-compose) | start a database, connect with psql, keep the URL in `.env` |
| [SQL essentials on the tray](02-sql-essentials-on-the-tray) | create tables, insert, select, join, and watch a transaction |
| [SQLAlchemy 2: engine, sessions, and mapped classes](03-sqlalchemy-2-engine-sessions-and-mapped-classes) | map a table to a class and read and write rows from Python |
| [Alembic migrations](04-alembic-migrations) | autogenerate, upgrade, downgrade, and lint a schema change |
| [A PostgreSQL catalog adapter](05-a-postgresql-catalog-adapter) | implement the R2 port on a session and wire it by environment |
| [Stock items and holds in a transaction](06-stock-items-and-holds-in-a-transaction) | model inventory, place a hold, commit or roll back per request |
| [The double-hold race and unique constraints](07-the-double-hold-race-and-unique-constraints) | reproduce the race, fix it with a partial unique index |
| [Integration tests on a real database](08-integration-tests-on-a-real-database) | run migrated, isolated tests against PostgreSQL |
| [Release gate: one hold wins](09-release-gate-one-hold-wins) | show 201 and 409 from two concurrent holds |

## Release evidence

From `gold-pasal`, with the database running:

```bash
uv run alembic upgrade head
uv run pytest tests/inventory -m integration -q
```

## What R5 starts from

`stock_items` and `holds` tables, `PostgresCatalog` and `PostgresInventory` adapters, `place_hold` with an injected clock, and the `integration` marker in use. R5 consumes a hold into an order, adds bearer tokens and roles, and moves configuration into `pydantic-settings`.
