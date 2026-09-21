---
id: r4-09
title: "Release gate: one hold wins"
release: r4
order: 9
prerequisites: [r4-08]
outcomes:
  - Rebuild the schema from nothing with alembic upgrade head
  - Show two concurrent holds resolving 201 and 409 from a live server
  - Run the integration suite and verify.sh green
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="inventory lead"
  problem="A reviewer will start from an empty database, seed one necklace, fire two holds at once, and read the two status codes. Then they will restart the server and ask whether the hold is still there."
  destination="From docker compose down -v to 201 and 409 in under two minutes, with every step a command from this release."
/>

# Release gate: one hold wins

A checklist, starting from nothing so the schema's reproducibility is part of the demo.

## See the idea first

1. Reset and start the database:

```bash
docker compose down -v
docker compose up -d db
```

Wait for `docker compose ps` to show `(healthy)`.

2. Recreate the test database and the schema:

```bash
docker compose exec db psql -U gold -d gold_pasal -c "CREATE DATABASE gold_pasal_test;"
export DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal
uv run alembic upgrade head
uv run alembic current
```

```text
INFO  [alembic.runtime.migration] Running upgrade  -> 18e5c1575a65, catalog items, stock items, holds
INFO  [alembic.runtime.migration] Running upgrade 18e5c1575a65 -> 7b2a4edf2330, one active hold per stock item
7b2a4edf2330 (head)
```

Two revisions, from empty to current, in one command.

3. Start the API with two workers:

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000 --workers 2
```

4. In a second terminal, the race:

```bash
uv run python ~/race.py GP-N-GATE
```

```text
201 hold-...
409 https://gold-pasal.example/problems/reservation-conflict
```

Run it again with a new id if the reviewer wants to see it twice. It is always one of each.

5. Restart uvicorn (`Ctrl-C`, start again) and read the hold back:

```bash
curl -s "http://127.0.0.1:8000/api/inventory/holds/<hold_id from step 4>"
```

Still `"status":"active"`. The row outlived the process.

6. Stop uvicorn. The tests:

```bash
export GOLD_PASAL_TEST_DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal_test
uv run pytest tests/inventory -m integration -q
./scripts/verify.sh
```

```text
5 passed in 0.74s
...
================= 49 passed, 5 deselected, 1 warning in 2.18s ==================
```

## Where each answer comes from

| Step | Answered by |
| --- | --- |
| schema from empty | `alembic/versions/*` and `env.py` reading `DATABASE_URL` |
| `201` for the first hold | `place_hold`, `PostgresInventory.add_hold`, `get_session` committing |
| `409` for the second | `ux_holds_one_active_per_stock_item`, `IntegrityError` mapped to `ReservationConflictError`, the problem handler |
| hold after restart | a committed row in `holds`; no process memory involved |
| `5 deselected` | the `integration` marker and `-m "not integration"` in `verify.sh` |
| the two-transaction test | `test_hold_race.py`: B blocks on A's uncommitted row until the index rejects it |

Say out loud: the catalog still speaks the R2 port. `PostgresCatalog` and `InMemoryCatalog` both satisfy `CatalogRepository`; `create_app` picks one; no route knows which.

## Failure drill

Drop the index behind Alembic's back, the way a hurried hotfix might, and watch the race come back:

```bash
docker compose exec db psql -U gold -d gold_pasal_test -c "DROP INDEX ux_holds_one_active_per_stock_item;"
uv run pytest tests/inventory -m integration -q -x
```

```text
FAILED tests/inventory/test_hold_race.py::test_two_overlapping_transactions_let_exactly_one_hold_commit
1 failed, 3 passed in 0.21s
```

The fixture's `upgrade head` did not restore the index, because `alembic_version` still says the database is at head. That is the cost of hand edits: Alembic's record and the real schema now disagree, and `downgrade` would fail trying to drop an index that is not there. Recreate it by hand to match the record:

```bash
docker compose exec db psql -U gold -d gold_pasal_test -c "CREATE UNIQUE INDEX ux_holds_one_active_per_stock_item ON holds (stock_item_id) WHERE status = 'active';"
```

Green again. On a real system you would write a revision instead of typing `CREATE INDEX`; here the drill is the point.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `alembic upgrade head` fails on the index | Duplicate active holds from the race page | `down -v` for a clean slate, or expire duplicates first |
| `201 201` from the race | Index not applied to this database | `uv run alembic current` should show the second revision |
| Hold gone after restart | uvicorn started without `DATABASE_URL` | Export it in the terminal that starts uvicorn |
| `5 deselected` but integration fails on connect | Test URL wrong | Points at `gold_pasal_test` on `localhost:5432` |
| `verify.sh` red on ruff for `alembic/` | Revision not linted | `uv run ruff check --fix alembic && uv run ruff format alembic` |

## Practice

<LessonQuiz
  question="Two customers hold one necklace at the same instant on two uvicorn workers. Which component decides the loser?"
  a="The first worker to receive the request"
  b="PostgreSQL, when the second INSERT violates the partial unique index"
  c="place_hold, by comparing timestamps"
  d="The TestClient"
  correct="b"
>

Both workers pass every Python check. The second `INSERT` is refused by the index, arrives as `IntegrityError`, and becomes the 409. Nothing in a process decides; the database does.

</LessonQuiz>

R5 turns an active hold into a paid order in the same kind of transaction, adds `SELECT ... FOR UPDATE` where uniqueness is not enough, and puts bearer tokens in front of the writes.

<EvidenceCard
  command="uv run python ~/race.py GP-N-GATE && uv run pytest tests/inventory -m integration -q"
  artifact="schema rebuilt from revisions; 201 and 409 from a live two-worker server; five integration tests green"
  invariant="Exactly one active hold per stock item, enforced by PostgreSQL and tested on PostgreSQL"
/>
