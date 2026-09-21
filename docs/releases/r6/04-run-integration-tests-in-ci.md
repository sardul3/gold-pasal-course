---
id: r6-04
title: "Run integration tests in CI"
release: r6
order: 4
prerequisites: [r6-03]
outcomes:
  - Add a GitHub Actions job with a PostgreSQL 16 service
  - Point GOLD_PASAL_TEST_DATABASE_URL at that service so Testcontainers is not used
  - Show a green integration check on a pull request
evidence: [pull-request, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="tests/inventory is green on your laptop because Docker is up and .env has GOLD_PASAL_TEST_DATABASE_URL. application-ci runs verify.sh, which excludes those tests. A dropped unique index would merge."
  destination="A second CI job starts postgres:16, runs pytest tests/inventory -m integration, and is green on a pull request."
/>

# Run integration tests in CI

`verify.sh` runs `pytest -m "not integration"` on purpose: the default gate stays fast and does not need Docker. That also means GitHub has never executed the hold race. A **service container** in GitHub Actions is a second container next to the job, here PostgreSQL 16, reachable at `localhost:5432`. The [R4 fixture](/releases/r4/08-integration-tests-on-a-real-database) already prefers `GOLD_PASAL_TEST_DATABASE_URL` over Testcontainers. Set that variable in the job and the fixture uses Actions' database.

## See the idea first

From `gold-pasal`, on a new branch:

```bash
git checkout main
git pull origin main
git checkout -b r6/ci-postgres
```

Replace `.github/workflows/ci.yml` with two jobs. Keep the R0 `verify` job. Add `integration`:

```yaml
name: application-ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv python install 3.12
      - run: uv sync --frozen --all-groups
      - run: ./scripts/verify.sh

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: gold
          POSTGRES_PASSWORD: gold
          POSTGRES_DB: gold_pasal_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U gold -d gold_pasal_test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      GOLD_PASAL_TEST_DATABASE_URL: postgresql+psycopg://gold:gold@localhost:5432/gold_pasal_test
      DATABASE_URL: postgresql+psycopg://gold:gold@localhost:5432/gold_pasal_test
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv python install 3.12
      - run: uv sync --frozen --all-groups
      - run: uv run pytest tests/inventory -m integration -q
```

The `gold:gold` user and password match [R4 Compose](/releases/r4/01-run-postgresql-with-docker-compose). They are local test credentials, not production secrets. Do not put your laptop `.env` tokens in this file.

## How the job finds PostgreSQL

| Piece | Role |
| --- | --- |
| `services.postgres` | starts `postgres:16` next to the job |
| `POSTGRES_DB: gold_pasal_test` | creates the empty database the fixture will migrate |
| `ports: 5432:5432` | publishes the port so the job talks to `localhost:5432` |
| `--health-cmd pg_isready` | Actions waits until Postgres accepts connections |
| `GOLD_PASAL_TEST_DATABASE_URL` | the fixture's "use this URL" switch |
| `DATABASE_URL` | Alembic inside the fixture reads this after the fixture copies it |

Walk one CI run: checkout, `uv sync --frozen`, pytest. The session fixture sees the URL, skips Testcontainers, runs `alembic upgrade head` against `gold_pasal_test`, truncates between tests. The seven tests from R4 and R5 execute on Ubuntu against PostgreSQL 16, the same major version as Compose.

`--frozen` refuses to resolve a new lockfile. CI installs what you committed. If `uv.lock` is stale, this job fails the same way `verify` would.

The two jobs run in parallel. `verify` does not need Postgres. A pricing failure and a hold-race failure show up as two red checks instead of one pile of logs.

## Prove the fixture locally first

Same URL shape as the job, against the Compose database you already use (create the extra database once):

```bash
docker compose exec db psql -U gold -d gold_pasal -c "SELECT 1 FROM pg_database WHERE datname = 'gold_pasal_test'" 
docker compose exec db psql -U gold -d postgres -c "CREATE DATABASE gold_pasal_test" 2>/dev/null || true
export GOLD_PASAL_TEST_DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal_test
uv run pytest tests/inventory -m integration -q | tail -1
```

```text
7 passed in 0.76s
```

If that fails, fix the fixture before you push. CI will fail the same way, only slower.

Do not use Testcontainers as the CI path. Nested Docker on GitHub-hosted runners is possible and a worse lesson: extra permissions, slower jobs, and a different Postgres than the service you just declared.

## Open the PR and watch both checks

```bash
git add .github/workflows/ci.yml
git commit -m "Run inventory tests against PostgreSQL in CI"
git push -u origin HEAD
gh pr create --base main --title "Run inventory tests in CI" --body "Adds an integration job with postgres:16. verify.sh still skips those tests locally."
gh pr checks
```

```text
application-ci / verify	pass	...
application-ci / integration	pass	...
```

Both names must be `pass`. Open the integration log and find `7 passed`. That line is the evidence that the race test ran off your laptop.

Merge:

```bash
gh pr merge --merge --delete-branch
git checkout main
git pull origin main
```

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `connection refused` on 5432 | Job started before Postgres was healthy | Keep the `pg_isready` options; do not drop `ports` |
| `database gold_pasal_test does not exist` | `POSTGRES_DB` typo | Must match the URL's database name |
| Testcontainers tries to start Docker in CI | URL unset | `GOLD_PASAL_TEST_DATABASE_URL` on the `integration` job `env:` |
| `alembic` cannot find `DATABASE_URL` | Fixture did not copy the URL | R5's `tests/inventory/conftest.py` sets `os.environ["DATABASE_URL"]` before `upgrade` |
| `7 deselected` / 0 passed | Marker mismatch | Run `-m integration`, not `not integration` |
| `uv sync --frozen` fails | `uv.lock` not committed | Commit the lockfile from `uv sync` on your laptop |
| Integration red, local green | Timezone or Postgres version drift | Both sides are 16; read the failing assertion in the CI log |

## Practice

<LessonQuiz
  question="Why does verify.sh keep excluding integration tests after this page?"
  a="Those tests are optional forever"
  b="The laptop gate stays fast and Docker-free; CI is the place that always has Postgres"
  c="pytest cannot run two markers in one repository"
  d="GitHub Actions forbids pytest"
  correct="b"
>

Two commands, two jobs. `./scripts/verify.sh` is what you run after every small edit. The integration job is what you trust before `main` moves. Dropping the marker from `verify.sh` would make every local save start a container.

</LessonQuiz>

Next: [Echo X-Request-ID](05-echo-x-request-id), so two log lines can be proved to be the same request.

<EvidenceCard
  command="gh pr checks"
  artifact="application-ci verify and integration both pass; pytest 7 passed in the integration log"
  invariant="Inventory tests run on GitHub against PostgreSQL 16, not only on a laptop with Compose"
/>
