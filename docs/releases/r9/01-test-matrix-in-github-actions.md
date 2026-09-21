---
id: r9-01
title: "Test matrix in GitHub Actions"
release: r9
order: 1
prerequisites: []
outcomes:
  - Split the workflow into unit, inventory, and container-smoke jobs
  - Keep uv cache without hiding a lockfile mismatch
evidence: [ci-run]
---

<LessonMission
  role="delivery owner"
  problem="R6 runs verify and inventory on every PR. A container smoke still only happens on your laptop."
  destination="application-ci runs unit, inventory (Postgres service), and a compose smoke as separate jobs."
/>

# Test matrix in GitHub Actions

R6 already added a PostgreSQL **service container** for `tests/inventory`. This page turns that workflow into a **matrix of jobs**: a fast unit job (`./scripts/verify.sh`), the inventory job, and a smoke that builds the R7 image and curls /ready. Cache `uv` with `actions/cache` keyed on `uv.lock`. If the lockfile changes, the cache misses. Do not cache `.venv` from a different Python.

## See the idea first

From `gold-pasal`:

```bash
cat .github/workflows/application-ci.yml | head -40
```

```text
name: application-ci
on:
  pull_request:
  push:
    branches: [main]
```

You wrote the skeleton in R6. You are adding jobs, not a second workflow file unless smoke needs `docker` permissions.

## Jobs

```yaml
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: ./scripts/verify.sh
  inventory:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: gold
          POSTGRES_PASSWORD: gold
          POSTGRES_DB: gold_pasal
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: uv run --env-file .env.example pytest tests/inventory -m integration -q
        env:
          GOLD_PASAL_TEST_DATABASE_URL: postgresql+psycopg://gold:gold@localhost:5432/gold_pasal
```

Do not put real tokens in the workflow. Use `.env.example` values for tests. Branch protection should require `unit` and `inventory` before merge. Container smoke can be required once it is stable.

Cache: key <code v-pre>uv-${{ hashFiles('uv.lock') }}</code>. A green cache with a dirty lockfile is a bug; the hash prevents that.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| inventory cannot connect | service not healthy | Wait on health; match user/password to R4 |
| verify red only on CI | Python version drift | Pin 3.12 in setup-uv |

## Practice

<LessonQuiz
  question="What should the uv cache key include?"
  a="The day of the week"
  b="The hash of uv.lock"
  c="The GitHub actor name"
  d="latest"
  correct="b"
>

The lockfile is the dependency identity. Caching without it hides resolution drift.

</LessonQuiz>

Next: [Build once to GHCR](02-build-once-to-ghcr).

<EvidenceCard
  command="gh run list --workflow=application-ci --limit 3"
  artifact="three named jobs on a PR check"
  invariant="Laptop-only tests are not the merge gate."
/>
