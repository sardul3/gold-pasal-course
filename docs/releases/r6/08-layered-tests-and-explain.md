---
id: r6-08
title: "Layered tests and EXPLAIN"
release: r6
order: 8
prerequisites: [r6-07]
outcomes:
  - Run tests/unit, tests/http, and tests/inventory as three commands
  - Time GET /api/catalog/items once
  - Read EXPLAIN for the list query and decide whether an index is warranted
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="Catalog list feels slow. Nobody timed it. A new index is about to land because a blog post said every WHERE needs one. Meanwhile a pricing failure still takes a whole verify.sh run to find."
  destination="Three pytest commands you can name in a review. One measured list duration. An EXPLAIN you can read, even if the plan stays a sequential scan."
/>

# Layered tests and EXPLAIN

The folders already exist: `tests/unit` (pricing, orders, catalog fakes), `tests/http` (TestClient, no Docker), `tests/inventory` (PostgreSQL, `integration` marker). `verify.sh` runs the first two groups plus the leftover top-level files, and skips inventory. This page makes the three commands you type during an incident explicit, then measures the catalog list before anyone "tunes" it.

**EXPLAIN** is PostgreSQL's description of how it would run a statement: which table, which index, estimated rows. `EXPLAIN (ANALYZE, BUFFERS)` also runs the statement and reports actual time. You read the plan. You do not add an index because a tutorial's sample output had one.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/unit -q | tail -1
uv run pytest tests/http -q | tail -1
uv run --env-file .env pytest tests/inventory -m integration -q | tail -1
```

```text
<n> passed in ...
<n> passed in ...
7 passed in 0.76s
```

First command: Decimal math, state machine, fakes. No `TestClient`. No Postgres.

Second: HTTP shape, auth, problem details, request ids. Still no Postgres if `create_app` uses in-memory adapters.

Third: unique index, `FOR UPDATE`, expiry. Needs the database.

If Maya's total breaks, only the first goes red. If `x-request-id` is missing, only the second. If the partial unique index dropped, only the third. That is the reason the folders exist.

`./scripts/verify.sh` stays the save-often gate. Do not fold inventory into it.

## Time the list once

With uvicorn running against Compose (so the list hits PostgreSQL):

```bash
curl -s -o /dev/null -w "%{time_total}\n" "http://127.0.0.1:8000/api/catalog/items?limit=20"
```

```text
0.012
```

Your number will differ. Write it down. That is the baseline. A laptop number is not an SLO; it is a before. If you change the query later, you run the same curl again.

`time_total` is the full HTTP round-trip: DNS (here localhost), the handler, JSON encoding, your shell. It is not database time. EXPLAIN is database time. Both are useful; they are not the same field.

## Read the plan

`list_items` in `src/gold_pasal/postgres.py` issues the SQL from [R4](/releases/r4/05-a-postgresql-catalog-adapter): `SELECT` catalog rows `ORDER BY sku LIMIT n`, plus `WHERE karat = ?` when a filter is present. In psql:

```bash
docker compose exec db psql -U gold -d gold_pasal
```

```sql
EXPLAIN SELECT sku, name, metal, karat, weight_grams
FROM catalog_items
WHERE karat = 22
ORDER BY sku
LIMIT 20;
```

```text
                          QUERY PLAN
--------------------------------------------------------------
 Limit
   ->  Sort
         Sort Key: sku
         ->  Seq Scan on catalog_items
               Filter: (karat = 22)
```

Exact cost numbers differ. What to notice:

| Node | Meaning |
| --- | --- |
| `Seq Scan on catalog_items` | read the table row by row |
| `Filter: (karat = 22)` | drop rows that are not 22K after reading them |
| `Sort` / `Limit` | order remaining rows and cut at 20 |

With a handful of seed rows, a sequential scan is the right plan. PostgreSQL will ignore an index that costs more to use than reading the table. That is not a failed optimization; it is the planner doing its job.

Create the index anyway so you can see the name in `\di`, then look at EXPLAIN again:

```sql
CREATE INDEX ix_catalog_items_karat ON catalog_items (karat);
EXPLAIN SELECT sku, name, metal, karat, weight_grams
FROM catalog_items
WHERE karat = 22
ORDER BY sku
LIMIT 20;
```

You might still see `Seq Scan`. You might see `Index Scan using ix_catalog_items_karat`. Either is acceptable on this data. Record which you got in a comment above `list_items` or in `docs/slo.md`:

```markdown
# Catalog list
Measured GET /api/catalog/items?limit=20 at <your seconds>s on this laptop.
EXPLAIN for karat=22 used Seq Scan (tiny table). No query change.
```

Do not add Redis. Do not add a cache header. If `list_items` loops and calls `get` per SKU, that is an N+1: fix it by using the single `select` you already have. The adapter from R4 does not N+1; if yours does, that is the change this measurement would earn.

Drop the unused index if EXPLAIN never used it and you do not want a migration for theatre:

```sql
DROP INDEX ix_catalog_items_karat;
```

If you keep it, it belongs in Alembic, not as a one-off in psql. A psql index dies when you `compose down -v`. This page does not require keeping it.

`\q` leaves psql.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `pytest tests/http` starts Docker | A test imported `tests.inventory.conftest` or used a real session factory | HTTP `create_app` stays in-memory |
| `pytest tests/unit` imports `TestClient` | A pricing test lived in the wrong folder | Move it |
| `curl` time `000` | Server down | Start uvicorn |
| `relation catalog_items does not exist` | Migrations not applied | `uv run --env-file .env alembic upgrade head` |
| EXPLAIN shows `Seq Scan` after `CREATE INDEX` | Table too small for the index to win | Leave it; document the measurement |
| Added a cache | Scope | Query shape and EXPLAIN only |

## Practice

<LessonQuiz
  question="EXPLAIN on a 12-row catalog_items table shows Seq Scan after you created ix_catalog_items_karat. What does that mean?"
  a="PostgreSQL is broken; delete Seq Scan from the server"
  b="The planner judged a full read cheaper than using the index on this data"
  c="You must switch to MongoDB"
  d="limit=20 is illegal"
  correct="b"
>

Indexes are not free. On tiny tables a sequential scan wins. Measure, read the plan, and write down the decision. An index that EXPLAIN never uses is still a write cost on every INSERT.

</LessonQuiz>

Next: [Release gate: incident from logs](09-release-gate-incident-from-logs). One id, from curl to JSON to the log line.

<EvidenceCard
  command="uv run pytest tests/unit -q && uv run pytest tests/http -q"
  artifact="three named pytest commands; one list duration; EXPLAIN captured for the karat filter"
  invariant="You do not add an index you have not seen in a plan. A pricing defect does not require PostgreSQL to see."
/>
