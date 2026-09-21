---
title: "R6: Team workflow and production confidence"
description: "Branches, pull requests, CI against PostgreSQL, request ids, /ready, and logs you can grep."
---

# R6: Team workflow and production confidence

**What you'll have:** your R5 shop on a GitHub pull request; `application-ci` running `verify.sh` and the inventory suite against PostgreSQL; every HTTP response carrying an `x-request-id`; `GET /ready` in OpenAPI; JSON logs you can grep by that id; and a missing SKU 404 that is problem details, not a traceback.

<LessonMission
  role="on-call engineer"
  problem="Checkout failed for one shopper. The unit suite is green. Logs have no shared key. The seven inventory tests only run on your laptop. The last change went to main without a review."
  destination="A merged PR. Two green CI jobs. GET /health echoes X-Request-ID. GET /ready exists. GP-DOES-NOT-EXIST is 404 problem JSON with request_id and no traceback. One log line with the same id."
/>

## Before you start

You finished [R5](/releases/r5/): `Settings` reads `.env`, write routes require bearer tokens and roles, `POST /api/orders` replays by `Idempotency-Key`, and `tests/inventory` is marked `integration` and green against PostgreSQL. Prove it from `gold-pasal`:

```bash
./scripts/verify.sh | tail -1
uv run --env-file .env pytest tests/inventory -m integration -q | tail -1
git status -sb
```

```text
================= 70 passed, 7 deselected, 1 warning in 2.36s ==================
7 passed in 0.76s
## main
```

Counts and the branch name may differ. What matters: verify is green, the seven integration tests pass, and you are on `main` with a clean tree. If `git status` shows edits, commit or stash them before the first Git page.

You need a [GitHub](https://github.com/) account and the [GitHub CLI](https://cli.github.com/). The first lesson installs `gh` if it is missing.

Hold expiry already takes a clock from [R4](/releases/r4/08-integration-tests-on-a-real-database). This release does not freeze time again.

## Guide

| Page | You will be able to |
| --- | --- |
| [Work on a branch](01-work-on-a-branch) | leave `main` alone, commit on `r6/team-workflow`, and push the branch |
| [Open a pull request](02-open-a-pull-request) | open, describe, and merge a PR with `gh` |
| [Rebase and resolve conflicts](03-rebase-and-resolve-conflicts) | rebase onto updated `main`, fix a conflict, continue |
| [Run integration tests in CI](04-run-integration-tests-in-ci) | add a GitHub Actions job with a PostgreSQL service |
| [Echo X-Request-ID](05-echo-x-request-id) | copy or create a request id on every response |
| [Add /ready and safe 404s](06-add-ready-and-safe-404s) | ping the database on `/ready`; put `request_id` on problem details |
| [Structured JSON logs](07-structured-json-logs) | one JSON line per request, greppable by `request_id` |
| [Layered tests and EXPLAIN](08-layered-tests-and-explain) | run unit, HTTP, and inventory as separate commands; read a query plan |
| [Release gate: incident from logs](09-release-gate-incident-from-logs) | trace one id from curl to 404 JSON to a log line |

## Release evidence

From `gold-pasal`, with uvicorn running:

```bash
./scripts/verify.sh
uv run --env-file .env pytest tests/inventory -m integration -q
curl -s -D - -H "X-Request-ID: acceptance-trace-42" http://127.0.0.1:8000/health
```

## What R7 starts from

A merged history on GitHub, two CI jobs, request ids on every response, `/ready`, JSON logs, and the same R5 checkout behavior. R7 puts that process in a container. It does not reopen pricing, holds, or orders.
