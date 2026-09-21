---
id: r4-07
title: "The double-hold race and unique constraints"
release: r4
order: 7
prerequisites: [r4-06]
outcomes:
  - Reproduce two 201s for one necklace with two concurrent requests
  - Add a partial unique index through a second Alembic revision
  - Turn the resulting IntegrityError into a 409 reservation-conflict problem
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory lead"
  problem="Two browsers tap Hold on the same tilhari at the same second. Both requests read no active hold, both insert one. Two customers each believe the necklace is theirs."
  destination="Two concurrent POST /api/inventory/holds on one stock item return 201 and 409, on one worker or many, because PostgreSQL refuses the second row."
/>

# The double-hold race and unique constraints

A **race condition** is a bug that only appears when two operations overlap in time. The `SELECT` then `INSERT` in `add_hold` is correct for one request at a time and wrong for two. This page makes the bug happen on purpose, then fixes it where it can be fixed: in the database.

## See the idea first

Save this outside the repository as `~/race.py`:

```python
"""Fire two hold requests at the same stock item at the same moment."""

import sys
from concurrent.futures import ThreadPoolExecutor

import httpx2 as httpx

stock_item_id = sys.argv[1]
base = "http://127.0.0.1:8000"

with httpx.Client(base_url=base, timeout=5) as client:
    client.post(
        "/api/inventory/items",
        json={"stock_item_id": stock_item_id, "sku": f"SKU-{stock_item_id}"},
    )


def hold() -> httpx.Response:
    with httpx.Client(base_url=base, timeout=5) as client:
        return client.post(
            "/api/inventory/holds", json={"stock_item_id": stock_item_id, "ttl_seconds": 900}
        )


with ThreadPoolExecutor(max_workers=2) as pool:
    responses = list(pool.map(lambda _: hold(), range(2)))

for response in responses:
    print(response.status_code, response.json().get("hold_id") or response.json().get("type"))
```

Start uvicorn with two workers so the requests can truly overlap:

```bash
export DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal
uv run uvicorn gold_pasal.api.app:app --port 8000 --workers 2
```

In a second terminal, from `gold-pasal`, run the script a few times with fresh ids:

```bash
for i in 1 2 3 4 5 6; do uv run python ~/race.py GP-N-RACE$i | sort | tr '\n' ' '; echo; done
```

```text
201 hold-d5f2f9d3e06f 409 https://gold-pasal.example/problems/reservation-conflict
201 hold-1ced7bd76e9e 201 hold-6fe95aba04e6
201 hold-03272808f9a1 201 hold-7a2b93e0bf7f
201 hold-3ba83077adc0 201 hold-aa1f56426382
201 hold-297f5a04ea46 201 hold-40a9dfb24b6d
201 hold-34667377d5e4 201 hold-514c8008bef4
```

Five of six rounds: two active holds on one necklace. Your numbers will differ; the shape will not. In psql:

```sql
SELECT stock_item_id, count(*) FROM holds WHERE status = 'active' GROUP BY stock_item_id HAVING count(*) > 1;
```

Rows with `count` 2. The bug is in the database now, not only in a response.

## Why the check did not help

Walk both requests:

```text
A: UPDATE stale holds        (none)
B: UPDATE stale holds        (none)
A: SELECT active hold         -> none
B: SELECT active hold         -> none   (A has not committed)
A: INSERT hold, COMMIT
B: INSERT hold, COMMIT
```

Each transaction sees the database as it was when it started; A's uncommitted row is invisible to B, exactly the isolation the SQL page showed with two psql sessions. Both checks were true when they ran. Nothing in Python can widen the window enough to notice.

A `threading.Lock` around `add_hold` would serialise requests inside one process. The two uvicorn workers are two processes, each with its own lock, and R8 runs several pods. The fix has to live in the one place every request meets: PostgreSQL.

## The fix: one active hold per stock item

Stop uvicorn. Add the partial unique index from the SQL page to `HoldRow` in `src/gold_pasal/orm.py`:

```python
from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, text


class HoldRow(Base):
    __tablename__ = "holds"
    __table_args__ = (
        Index(
            "ux_holds_one_active_per_stock_item",
            "stock_item_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )
    ...
```

`unique=True` plus `postgresql_where` is "at most one row per `stock_item_id` among rows where status is active". Expired and consumed holds are outside the condition, so history stays.

Generate the revision:

```bash
uv run alembic revision --autogenerate -m "one active hold per stock item"
uv run ruff check --fix alembic && uv run ruff format alembic
```

```text
INFO  [alembic.autogenerate.compare.constraints] Detected added index 'ux_holds_one_active_per_stock_item' on '('stock_item_id',)'
Generating .../alembic/versions/7b2a4edf2330_one_active_hold_per_stock_item.py ...  done
```

The file:

```python
def upgrade() -> None:
    op.create_index(
        "ux_holds_one_active_per_stock_item",
        "holds",
        ["stock_item_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade() -> None:
    op.drop_index(
        "ux_holds_one_active_per_stock_item",
        table_name="holds",
        postgresql_where=sa.text("status = 'active'"),
    )
```

Apply it:

```bash
uv run alembic upgrade head
```

```text
sqlalchemy.exc.IntegrityError: (psycopg.errors.UniqueViolation) could not create unique index "ux_holds_one_active_per_stock_item"
DETAIL:  Key (stock_item_id)=(GP-N-RACE2) is duplicated.
```

The migration refused, and it was right to: the race left duplicate active holds in the table, and a unique index cannot be built over duplicates. This is what a constraint migration does on real data. Decide what the data should be, fix it, then migrate. Here, keep the oldest active hold per item and expire the rest:

```sql
UPDATE holds SET status = 'expired'
WHERE hold_id IN (
    SELECT hold_id FROM (
        SELECT hold_id, row_number() OVER (PARTITION BY stock_item_id ORDER BY expires_at) AS n
        FROM holds WHERE status = 'active'
    ) ranked WHERE n > 1
);
```

```text
UPDATE 5
```

Then:

```bash
uv run alembic upgrade head
```

```text
INFO  [alembic.runtime.migration] Running upgrade 18e5c1575a65 -> 7b2a4edf2330, one active hold per stock item
```

Transactional DDL meant the failed attempt left nothing behind; the second attempt started clean.

## Catch the violation

Now the second `INSERT` raises `IntegrityError` at `flush()`. Update `add_hold` in `src/gold_pasal/postgres.py` to translate it:

```python
from sqlalchemy.exc import IntegrityError

        ...
        self._session.add(
            HoldRow(
                hold_id=hold.hold_id,
                stock_item_id=hold.stock_item_id,
                status=hold.status.value,
                expires_at=hold.expires_at,
            )
        )
        try:
            self._session.flush()
        except IntegrityError:
            self._session.rollback()
            raise ReservationConflictError(hold.stock_item_id) from None
        return hold
```

Keep the `SELECT` check above it: it gives the common sequential case a clean answer without touching the index. The `try` is for the case the check cannot see. `rollback()` first, because a session that hit an error must be rolled back before anything else uses it, and `from None` hides the driver's traceback behind the shop's exception. The existing `ReservationConflictError` handler turns it into the 409 problem; nothing in the API layer changes.

Restart uvicorn with two workers and run the race again:

```text
201 hold-6eb11a82973c 409 https://gold-pasal.example/problems/reservation-conflict
201 hold-2f4c243a213f 409 https://gold-pasal.example/problems/reservation-conflict
201 hold-c61257800dcc 409 https://gold-pasal.example/problems/reservation-conflict
201 hold-daaf4ff85cb1 409 https://gold-pasal.example/problems/reservation-conflict
201 hold-1f6854b16b3a 409 https://gold-pasal.example/problems/reservation-conflict
201 hold-b55c06496b15 409 https://gold-pasal.example/problems/reservation-conflict
```

Six of six. The `GROUP BY ... HAVING count(*) > 1` query now returns no rows and never will again.

## Other ways to serialise

| Approach | Where | Trade-off |
| --- | --- | --- |
| partial unique index (this page) | database | declarative, survives any number of workers, cheap; the rule must be expressible as uniqueness |
| `SELECT ... FOR UPDATE` on the stock item row | database | locks the parent row so the second transaction waits, then sees the first's hold; more flexible, holds a lock for the transaction's length. R5 uses it to consume a hold |
| serializable isolation | database | catches every anomaly, at the cost of retrying aborted transactions |
| a lock in Python | process | wrong for more than one process |

When the invariant is "at most one of these", the unique index is the answer. Reach for `FOR UPDATE` when the rule is a computation the index cannot state.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Race script always prints `201 409` before the fix | Requests did not overlap | `--workers 2`; run it several times |
| `could not create unique index ... is duplicated` | Existing duplicate active holds | Expire duplicates with the `UPDATE` above, then upgrade |
| Two `500`s instead of `201 409` | `IntegrityError` not caught | The `try` around `flush()` in `add_hold` |
| `InvalidRequestError: This Session's transaction has been rolled back` | Raised before `rollback()` | Roll back, then raise |
| Autogenerate did not detect the index | `postgresql_where` missing or `orm` not imported in `env.py` | Check both |
| `409` type wrong | Slug differs | `reservation-conflict` |

## Practice

<LessonQuiz
  question="Why does a threading.Lock around add_hold not fix the race in production?"
  a="Locks are slow"
  b="uvicorn runs several worker processes, and later Kubernetes runs several pods; each has its own lock and none sees the others' inserts until commit"
  c="Python cannot lock inside a database transaction"
  d="It does fix it; the index is only for performance"
  correct="b"
>

A process-local lock serialises requests inside one process only. The shop will run many processes. The only participant every request shares is the database, so the database holds the rule.

</LessonQuiz>

Next: [Integration tests on a real database](08-integration-tests-on-a-real-database), where this race becomes a test that runs every time.

<EvidenceCard
  command="uv run alembic current"
  artifact="revision creating ux_holds_one_active_per_stock_item; IntegrityError mapped to 409; six of six races resolved 201 and 409"
  invariant="PostgreSQL, not a lock in one Python process, decides which hold wins"
/>
