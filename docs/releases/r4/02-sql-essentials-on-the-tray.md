---
id: r4-02
title: "SQL essentials on the tray"
release: r4
order: 2
prerequisites: [r4-01]
outcomes:
  - Create tables with primary keys, NOT NULL, CHECK, and foreign keys
  - Insert, select, filter, order, group, join, and update rows
  - Watch a transaction roll back and a unique index refuse a duplicate
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory lead"
  problem="The tray lives in a Python list. You are about to hand it to a database and you have never typed SQL. Every error SQLAlchemy shows you next week will be a PostgreSQL error in disguise."
  destination="At the psql prompt you can define the two inventory tables by hand, put rows in, ask questions of them, and see the database refuse bad data before Python ever sees it."
/>

# SQL essentials on the tray

**SQL** is the language you speak to a relational database. A **table** has named, typed columns and holds rows. **Constraints** are rules the database enforces on every row, no matter which program wrote it. This page types the shop's inventory into PostgreSQL by hand, once, so the SQLAlchemy code on the next pages is a translation of something you have already seen.

## See the idea first

From `gold-pasal`, with the database from the previous page running:

```bash
docker compose exec db psql -U gold -d gold_pasal
```

Create a table of stock items:

```sql
CREATE TABLE tray_items (
    stock_item_id TEXT PRIMARY KEY,
    sku           TEXT NOT NULL,
    grams         NUMERIC(12, 4) NOT NULL CHECK (grams > 0),
    karat         INTEGER NOT NULL CHECK (karat IN (14, 18, 22, 24))
);
```

```text
CREATE TABLE
```

Four columns, each with a type and rules. This is `Weight` and `Purity` from R2, written as constraints the database enforces.

These are scratch tables named `tray_*`; the last step drops them. Alembic creates the real `stock_items` and `holds` on page 4, and hand-made tables with those names would collide.

## Column types and constraints

| Written | Means |
| --- | --- |
| `TEXT` | a string of any length |
| `INTEGER` | a whole number |
| `NUMERIC(12, 4)` | exact decimal: 12 digits, 4 after the point. Money and grams, never `FLOAT` |
| `TIMESTAMPTZ` | a moment in time with its timezone |
| `PRIMARY KEY` | unique and not null; the row's identity |
| `NOT NULL` | the column must have a value |
| `CHECK (...)` | a condition every row must satisfy |
| `REFERENCES other (col)` | a **foreign key**: the value must exist in the other table |

`NUMERIC` is the SQL side of Python's `Decimal`. The driver converts between them without loss.

## Insert and select

```sql
INSERT INTO tray_items (stock_item_id, sku, grams, karat) VALUES
    ('GP-N-0001', 'GP-NECKLACE-0001', 11.6638038, 22),
    ('GP-R-0001', 'GP-RING-0001', 5.0000, 22),
    ('GP-B-0001', 'GP-BANGLE-0001', 8.4000, 18);
```

```text
INSERT 0 3
```

Strings use single quotes in SQL. Now read them back:

```sql
SELECT * FROM tray_items;
```

```text
 stock_item_id |       sku        |  grams  | karat
---------------+------------------+---------+-------
 GP-N-0001     | GP-NECKLACE-0001 | 11.6638 |    22
 GP-R-0001     | GP-RING-0001     |  5.0000 |    22
 GP-B-0001     | GP-BANGLE-0001   |  8.4000 |    18
(3 rows)
```

`11.6638038` became `11.6638`: `NUMERIC(12, 4)` keeps four decimal places and rounded the rest. The shop's scale reads to four places, so that is the right precision for grams; if it were not, the column type would be wrong, not the data.

### Filter, order, group

```sql
SELECT stock_item_id, grams FROM tray_items WHERE karat = 22 ORDER BY grams DESC;
```

```text
 stock_item_id |  grams
---------------+---------
 GP-N-0001     | 11.6638
 GP-R-0001     |  5.0000
(2 rows)
```

`WHERE` filters rows; `ORDER BY ... DESC` sorts descending. This is the `karat=22` filter from R3's list endpoint, as the database will run it.

```sql
SELECT karat, count(*), sum(grams) AS grams FROM tray_items GROUP BY karat ORDER BY karat;
```

```text
 karat | count |  grams
-------+-------+---------
    18 |     1 |  8.4000
    22 |     2 | 16.6638
(2 rows)
```

`GROUP BY` collapses rows that share a value; `count` and `sum` summarise each group. `AS` names the output column.

## Constraints refuse bad rows

```sql
INSERT INTO tray_items VALUES ('GP-X-0001', 'GP-X', 5, 19);
```

```text
ERROR:  new row for relation "tray_items" violates check constraint "tray_items_karat_check"
DETAIL:  Failing row contains (GP-X-0001, GP-X, 5.0000, 19).
```

```sql
INSERT INTO tray_items VALUES ('GP-N-0001', 'GP-DUP', 5, 22);
```

```text
ERROR:  duplicate key value violates unique constraint "tray_items_pkey"
DETAIL:  Key (stock_item_id)=(GP-N-0001) already exists.
```

Nothing was inserted in either case. `Purity(19)` raised in Python in R2; here the database raises. Both layers checking is not redundant: Python gives the customer a message, the database guarantees the rule even for a program that forgot to check.

## A second table and a join

Holds point at stock items:

```sql
CREATE TABLE tray_holds (
    hold_id       TEXT PRIMARY KEY,
    stock_item_id TEXT NOT NULL REFERENCES tray_items (stock_item_id),
    status        TEXT NOT NULL DEFAULT 'active',
    expires_at    TIMESTAMPTZ NOT NULL
);

INSERT INTO tray_holds VALUES ('hold-0001', 'GP-N-0001', 'active', now() + interval '15 minutes');
```

```text
CREATE TABLE
INSERT 0 1
```

`now() + interval '15 minutes'` is the database computing `expires_at`. A hold on a stock item that does not exist:

```sql
INSERT INTO tray_holds VALUES ('hold-0002', 'GP-MISSING', 'active', now());
```

```text
ERROR:  insert or update on table "tray_holds" violates foreign key constraint "tray_holds_stock_item_id_fkey"
DETAIL:  Key (stock_item_id)=(GP-MISSING) is not present in table "tray_items".
```

The foreign key made a ghost reservation impossible. A **join** reads across the two tables:

```sql
SELECT h.hold_id, i.sku, h.status
FROM tray_holds AS h
JOIN tray_items AS i ON i.stock_item_id = h.stock_item_id;
```

```text
  hold_id  |       sku        | status
-----------+------------------+--------
 hold-0001 | GP-NECKLACE-0001 | active
(1 row)
```

`JOIN ... ON` pairs each hold with the item whose id matches. `h` and `i` are aliases so the column names stay short.

## Update, and a transaction

```sql
UPDATE tray_items SET karat = 24 WHERE stock_item_id = 'GP-R-0001';
```

```text
UPDATE 1
```

Always write the `WHERE`. `UPDATE tray_items SET karat = 24;` with no `WHERE` changes every row, and PostgreSQL will do exactly that.

A **transaction** groups statements so they all commit or none do:

```sql
BEGIN;
UPDATE tray_holds SET status = 'consumed' WHERE hold_id = 'hold-0001';
SELECT status FROM tray_holds;
ROLLBACK;
SELECT status FROM tray_holds;
```

```text
BEGIN
UPDATE 1
  status
----------
 consumed
(1 row)

ROLLBACK
 status
--------
 active
(1 row)
```

Inside the transaction the hold read as consumed. `ROLLBACK` undid it; `COMMIT` would have kept it. Every request in the API from page 6 on is one transaction: the route's writes commit together or roll back together.

Open a second terminal with a second `psql`, run the `BEGIN` and `UPDATE` in the first without committing, and `SELECT` in the second. The second session still sees `active`. Other connections never see an uncommitted change; that isolation is what makes "commit or roll back" a real promise.

## A unique index with a condition

The shop's rule is "one active hold per stock item". A **partial unique index** says exactly that:

```sql
CREATE UNIQUE INDEX ux_tray_holds_active ON tray_holds (stock_item_id) WHERE status = 'active';
```

```text
CREATE INDEX
```

```sql
INSERT INTO tray_holds VALUES ('hold-0003', 'GP-N-0001', 'active', now() + interval '15 minutes');
```

```text
ERROR:  duplicate key value violates unique constraint "ux_tray_holds_active"
DETAIL:  Key (stock_item_id)=(GP-N-0001) already exists.
```

Uniqueness applies only to rows where `status = 'active'`, so consumed and expired holds for the same item can pile up as history while only one active one exists. Page 7 uses this exact index to end the double-hold race; you have now seen it work by hand.

An **index** also makes lookups fast. `EXPLAIN` shows how PostgreSQL will run a query:

```sql
EXPLAIN SELECT * FROM tray_items WHERE stock_item_id = 'GP-R-0001';
```

```text
 Index Scan using tray_items_pkey on tray_items  (cost=0.15..8.17 rows=1 width=84)
   Index Cond: (stock_item_id = 'GP-R-0001'::text)
```

An index scan on the primary key: one row, straight to it. A `WHERE` on a column with no index would say `Seq Scan`, reading every row. R6 comes back to `EXPLAIN` for a slow catalog list.

## Clean up

Drop the scratch tables so Alembic starts from an empty database:

```sql
DROP TABLE tray_holds;
DROP TABLE tray_items;
\dt
```

```text
DROP TABLE
DROP TABLE
Did not find any relations.
```

`\q` to leave.

## SQL you will see from Python

| SQL | SQLAlchemy 2, next page |
| --- | --- |
| `CREATE TABLE` | a mapped class; Alembic writes the DDL |
| `INSERT` | `session.add(row)` |
| `SELECT ... WHERE` | `session.scalars(select(Row).where(...))` |
| `UPDATE` | change an attribute, or `update(Row).where(...).values(...)` |
| `BEGIN` / `COMMIT` / `ROLLBACK` | the session's transaction; `session.commit()` and `session.rollback()` |
| `duplicate key value violates unique constraint` | `IntegrityError` |

You will not write raw SQL in the application. You will read it in every error message and every `EXPLAIN`.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `syntax error at or near` | Missing `;`, or a double-quoted string | End statements with `;`; strings use single quotes |
| `relation "tray_items" does not exist` | Table not created, or typo | `\dt` to list tables |
| `column "karat" does not exist` | Typo in a column name | `\d tray_items` shows the columns |
| `current transaction is aborted` | An error inside `BEGIN` | `ROLLBACK;` then start again |
| Prompt shows `gold_pasal-#` (hyphen) | Statement not finished | Type `;` |
| Tables still exist when Alembic runs | Skipped the clean-up | `DROP TABLE tray_holds; DROP TABLE tray_items;` |

## Practice

<LessonQuiz
  question="A hold is inserted for stock item GP-MISSING, which is not in tray_items. What stops it?"
  a="Nothing; SQL stores whatever it is given"
  b="The foreign key on tray_holds.stock_item_id rejects the row"
  c="The CHECK on karat"
  d="The partial unique index"
  correct="b"
>

`REFERENCES tray_items (stock_item_id)` requires the value to exist in the parent table. The database refuses the insert with a foreign key violation; Python never has to check for ghost reservations after the fact.

</LessonQuiz>

Next: [SQLAlchemy 2: engine, sessions, and mapped classes](03-sqlalchemy-2-engine-sessions-and-mapped-classes), the same tables from Python.

<EvidenceCard
  command="docker compose exec db psql -U gold -d gold_pasal"
  artifact="scratch tables created, queried, constrained, and dropped at the psql prompt"
  invariant="Rules the shop cares about (positive grams, four karats, one active hold) are database constraints, not only Python checks"
/>
