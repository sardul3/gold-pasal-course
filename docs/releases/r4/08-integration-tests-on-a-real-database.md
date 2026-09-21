---
id: r4-08
title: "Integration tests on a real database"
release: r4
order: 8
prerequisites: [r4-07]
outcomes:
  - Build a session-scoped, Alembic-migrated test database from an env URL or a Testcontainers container
  - Isolate tests with TRUNCATE and mark them integration
  - Test the race with two overlapping transactions and expiry with a frozen clock
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory lead"
  problem="The race is fixed on your laptop, proved by a script you ran by hand. Next month someone drops the index in a migration and nothing turns red."
  destination="tests/inventory runs against a real, migrated PostgreSQL, proves the race resolves 201 and 409, proves expiry with a frozen clock, and stays out of verify.sh's default run behind the integration marker."
/>

# Integration tests on a real database

An **integration test** exercises the code together with a real dependency. For inventory, that dependency is PostgreSQL: the unique index, the transaction, and the timestamps are the things under test, and no fake can stand in for them. This page builds the fixture that gives every test a migrated, empty database, and writes the tests the race and expiry pages earned.

## See the idea first

The R2 marker is about to earn its keep. From `gold-pasal`, `pyproject.toml` already has:

```toml
[tool.pytest.ini_options]
addopts = "-ra --strict-markers"
testpaths = ["tests"]
markers = [
  "integration: needs a real service such as PostgreSQL",
]
```

And `verify.sh` runs `pytest -m "not integration"`. Tests marked `integration` are skipped by the default gate and run on purpose with `-m integration`.

## Where the database comes from

Two sources, one fixture. If `GOLD_PASAL_TEST_DATABASE_URL` is set, use that database. Otherwise start a throwaway PostgreSQL container with **Testcontainers**, a library that runs Docker images from tests and removes them afterwards.

```bash
uv add --group dev testcontainers
```

Create `tests/inventory/conftest.py`:

```python
"""A real PostgreSQL for inventory tests: a test database URL, or a throwaway container."""

import os
from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from gold_pasal.api.app import create_app
from gold_pasal.db import make_engine, make_session_factory


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    configured = os.environ.get("GOLD_PASAL_TEST_DATABASE_URL")
    if configured:
        yield configured
        return
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16", driver="psycopg") as container:
        yield container.get_connection_url()


@pytest.fixture(scope="session")
def migrated_engine(database_url: str) -> Iterator[Engine]:
    os.environ["DATABASE_URL"] = database_url
    command.upgrade(Config("alembic.ini"), "head")
    engine = make_engine(database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def engine(migrated_engine: Engine) -> Engine:
    with migrated_engine.begin() as connection:
        connection.execute(text("TRUNCATE holds, stock_items, catalog_items"))
    return migrated_engine


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    app = create_app(session_factory=make_session_factory(engine))
    with TestClient(app) as test_client:
        yield test_client
```

### Reading the fixtures

`database_url` is `scope="session"`: one database for the whole run. Starting a container takes seconds; doing it per test would take minutes. The `import` of Testcontainers sits inside the fixture so a machine with the env URL set never needs Docker or the package's Docker client.

`migrated_engine` runs `alembic upgrade head` programmatically, through the same `alembic.ini` and `env.py` the command line uses, after setting `DATABASE_URL` so `env.py` finds it. The tests run against the schema the migrations produce, not against `create_all`. If a revision is broken, this fixture fails first.

`engine` is function-scoped and truncates the three tables before each test. `TRUNCATE a, b, c` in one statement handles the foreign keys. Every test starts from zero rows and a migrated schema; the race test cannot be confused by a hold the previous test left.

`client` is the same shape as `tests/http/conftest.py`, with a session factory. Routes go through the real dependency chain: `get_session`, `PostgresInventory`, commit or rollback.

### The test database

Create one next to the development database so a truncate never touches data you care about:

```bash
docker compose exec db psql -U gold -d gold_pasal -c "CREATE DATABASE gold_pasal_test;"
export GOLD_PASAL_TEST_DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal_test
```

Put the key in `.env.example` with no value and in `.env` with the value. Without the variable, Testcontainers starts `postgres:16` on a random port, and Docker must be running.

## The tests

Create `tests/inventory/test_holds.py`:

```python
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration

NECKLACE = {"stock_item_id": "GP-N-0001", "sku": "GP-NECKLACE-0001"}
HOLD = {"stock_item_id": "GP-N-0001", "ttl_seconds": 900}


def test_seed_then_hold_returns_a_persisted_hold(client: TestClient) -> None:
    seeded = client.post("/api/inventory/items", json=NECKLACE)
    held = client.post("/api/inventory/holds", json=HOLD)

    assert seeded.status_code == 201, seeded.text
    assert held.status_code == 201, held.text
    hold_id = held.json()["hold_id"]
    assert client.get(f"/api/inventory/holds/{hold_id}").json()["status"] == "active"


def test_hold_on_unknown_stock_item_is_a_404_problem(client: TestClient) -> None:
    response = client.post("/api/inventory/holds", json={**HOLD, "stock_item_id": "GP-N-MISSING"})

    assert response.status_code == 404
    assert response.json()["type"].endswith("/unknown-stock-item")


def test_second_hold_is_a_409_reservation_conflict(client: TestClient) -> None:
    client.post("/api/inventory/items", json=NECKLACE)
    client.post("/api/inventory/holds", json=HOLD)

    response = client.post("/api/inventory/holds", json=HOLD)

    assert response.status_code == 409
    assert response.json()["type"].endswith("/reservation-conflict")
```

`pytestmark = pytest.mark.integration` at module level marks every test in the file.

### The race, deterministically

Firing two HTTP requests from two threads at an in-process `TestClient` does not reproduce the race: the client serialises them enough that the `SELECT` check catches the second one, and the test passes with or without the index. A test that passes without the thing it guards is worse than no test. Go one level down and overlap two transactions on purpose. Create `tests/inventory/test_hold_race.py`:

```python
"""Two transactions race for one necklace. Only the database can decide who wins."""

import threading
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine

from gold_pasal.db import make_session_factory
from gold_pasal.errors import ReservationConflictError
from gold_pasal.inventory import Hold, HoldStatus, StockItem
from gold_pasal.postgres import PostgresInventory

pytestmark = pytest.mark.integration

T0 = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)


def hold(hold_id: str) -> Hold:
    return Hold(hold_id, "GP-N-0001", HoldStatus.ACTIVE, T0 + timedelta(seconds=900))


def test_two_overlapping_transactions_let_exactly_one_hold_commit(engine: Engine) -> None:
    factory = make_session_factory(engine)
    with factory() as seed:
        PostgresInventory(seed).add_stock_item(StockItem("GP-N-0001", "GP-NECKLACE-0001"))
        seed.commit()

    outcome: dict[str, object] = {}

    def second_customer() -> None:
        with factory() as session_b:
            try:
                PostgresInventory(session_b).add_hold(hold("hold-b"), now=T0)
                session_b.commit()
                outcome["b"] = "committed"
            except ReservationConflictError as exc:
                outcome["b"] = exc

    with factory() as session_a:
        PostgresInventory(session_a).add_hold(hold("hold-a"), now=T0)  # flushed, not committed
        runner = threading.Thread(target=second_customer)
        runner.start()
        runner.join(timeout=0.5)  # B is now blocked on A's uncommitted row (or already done)
        session_a.commit()
    runner.join()

    assert isinstance(outcome["b"], ReservationConflictError)
```

Walk it. Transaction A inserts its hold and flushes but does not commit, so the row is invisible to everyone else. Thread B starts, runs the `SELECT` (sees nothing, because A is uncommitted), and issues its `INSERT`. With the index, PostgreSQL makes B wait: it cannot know whether A's row will commit. The main thread waits half a second, then commits A. B's `INSERT` now violates the index, `flush()` raises, and the adapter turns it into `ReservationConflictError`. Without the index, B's `INSERT` succeeds immediately, both transactions commit, and the assertion fails with `"committed"`. Same code, both outcomes, decided by the schema alone.

And `tests/inventory/test_hold_expiry.py`:

```python
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from gold_pasal.api.app import create_app
from gold_pasal.db import make_session_factory

pytestmark = pytest.mark.integration

T0 = datetime(2026, 9, 21, 10, 0, tzinfo=UTC)


class FrozenClock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


def test_an_expired_hold_frees_the_item_for_the_next_customer(engine: Engine) -> None:
    clock = FrozenClock(T0)
    app = create_app(session_factory=make_session_factory(engine), clock=clock)
    with TestClient(app) as client:
        client.post("/api/inventory/items", json={"stock_item_id": "GP-N-0001", "sku": "GP-N"})
        first = client.post(
            "/api/inventory/holds", json={"stock_item_id": "GP-N-0001", "ttl_seconds": 60}
        )
        blocked = client.post(
            "/api/inventory/holds", json={"stock_item_id": "GP-N-0001", "ttl_seconds": 60}
        )

        clock.now = T0 + timedelta(seconds=61)
        second = client.post(
            "/api/inventory/holds", json={"stock_item_id": "GP-N-0001", "ttl_seconds": 60}
        )
        first_again = client.get(f"/api/inventory/holds/{first.json()['hold_id']}")

    assert (first.status_code, blocked.status_code, second.status_code) == (201, 409, 201)
    assert first_again.json()["status"] == "expired"
```

This test builds its own app because it needs to pass the clock. Sixty-one seconds pass by assignment; the `UPDATE ... expires_at <= now` in `add_hold` expires the first hold inside the database, and the response for `first_again` proves the row changed.

## Run them

```bash
uv run pytest tests/inventory -m integration -q
```

```text
.....                                                                    [100%]
5 passed in 0.74s
```

Five tests against real PostgreSQL; the half-second is the race test waiting on purpose. Then the default gate:

```bash
./scripts/verify.sh
```

```text
================= 49 passed, 5 deselected, 1 warning in 2.18s ==================
```

`5 deselected`: the integration tests were skipped by `-m "not integration"`, so `verify.sh` still passes on a laptop with no database running. CI runs the same command; R6 wires the integration tests into a CI job that provides a database.

## The three layers

| Folder | Talks to | Runs when |
| --- | --- | --- |
| `tests/unit` | nothing outside the process | always; milliseconds |
| `tests/http` | the app in-process with in-memory adapters | always; tenths of a second |
| `tests/inventory` | the app plus PostgreSQL | `-m integration`; needs a database |

The same behavior often appears twice: `test_second_hold_on_a_held_item_conflicts` on the fake in `tests/unit/inventory`, and `test_second_hold_is_a_409_reservation_conflict` on PostgreSQL here. The first proves the rule; the second proves the adapter and the index enforce it. When the unit test fails, the logic is wrong. When only the integration test fails, the database disagrees with the fake, and that is the bug to chase.

::: tip Keep the fake honest
Whenever the PostgreSQL adapter gains a behavior, give the fake the same one and write the unit test first. A fake that drifts from the real adapter makes `tests/http` pass on code that fails in production.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `docker.errors.DockerException` from Testcontainers | Docker not running, or env URL not set | Start Docker, or export `GOLD_PASAL_TEST_DATABASE_URL` |
| `KeyError: 'DATABASE_URL'` inside `command.upgrade` | Fixture did not set it before upgrading | `os.environ["DATABASE_URL"] = database_url` first |
| `relation "holds" does not exist` | Migrations did not run, or wrong database | Check the URL points at the test database and `migrated_engine` ran |
| Race test fails with `"committed"` | Index missing on the test database | `alembic upgrade head` there; the fixture does this unless the index was dropped by hand |
| Race test hangs | B blocked and A never committed | The `runner.join(timeout=0.5)` must come before `session_a.commit()` |
| Tests pass alone, fail together | A test left rows behind | `TRUNCATE` in the `engine` fixture must list every table |
| `verify.sh` runs the integration tests | Marker missing | `pytestmark = pytest.mark.integration` at the top of each file |
| Truncating the development database | Test URL points at `gold_pasal` | Use `gold_pasal_test` |

## Practice

<LessonQuiz
  question="./scripts/verify.sh prints 5 deselected. Is the race protected?"
  a="No; deselected means the tests failed silently"
  b="Yes, when you run uv run pytest tests/inventory -m integration and it passes; verify.sh skips tests that need a database by design"
  c="Yes; deselected tests are run in a background process"
  d="No; integration tests never run"
  correct="b"
>

The marker splits the suite into what every machine can run and what needs PostgreSQL. `verify.sh` is the first group. The gate for this release runs the second group explicitly, and R6 gives CI a database so both run there.

</LessonQuiz>

Next: [Release gate: one hold wins](09-release-gate-one-hold-wins).

<EvidenceCard
  command="uv run pytest tests/inventory -m integration -q"
  artifact="tests/inventory/conftest.py with a migrated, truncated PostgreSQL; five integration tests including a two-transaction race and clock-driven expiry"
  invariant="The unique index and the transaction are tested on PostgreSQL every time, not proved once by hand"
/>
