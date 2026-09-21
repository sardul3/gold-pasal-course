---
id: r6-09
title: "Release gate: incident from logs"
release: r6
order: 9
prerequisites: [r6-08]
outcomes:
  - Trace one request id from a curl header to 404 JSON to a JSON log line
  - Show /health echo, /ready in OpenAPI, and two green CI jobs
  - Write a short incident note with impact, cause, and follow-up
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="on-call engineer"
  problem="A reviewer will send a made-up SKU and ask you to prove, from artifacts, that the 404 is that request. Guessing which uvicorn line matches is not the demo."
  destination="One id on the response header, in problem JSON, and in a log line. verify.sh green. integration job green. A ten-line incident.md with no secrets."
/>

# Release gate: incident from logs

A checklist. The Git pages left `main` with a merged PR and a CI file. The observability pages left middleware, `/ready`, problem `request_id`, and JSON logs. This page is the demo you would run on a call.

## See the idea first

1. Tests, including inventory:

```bash
./scripts/verify.sh | tail -1
uv run --env-file .env pytest tests/inventory -m integration -q | tail -1
```

```text
================= <n> passed, 7 deselected, 1 warning in ... ==================
7 passed in 0.76s
```

2. Start uvicorn from `gold-pasal` so `.env` loads, redirect stderr to a file you can grep:

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000 2> /tmp/gold-pasal.log
```

3. Health echo, ready, missing SKU, all with the same id:

```bash
curl -s -D - -H "X-Request-ID: incident-7" http://127.0.0.1:8000/health | grep -i x-request-id
curl -s http://127.0.0.1:8000/ready
curl -s -H "X-Request-ID: incident-7" http://127.0.0.1:8000/api/catalog/items/GP-DOES-NOT-EXIST
grep incident-7 /tmp/gold-pasal.log
```

```text
x-request-id: incident-7
{"status":"ready"}
{"type":"https://gold-pasal.example/problems/unknown-sku","title":"Unknown SKU","status":404,"detail":"no catalog item with sku 'GP-DOES-NOT-EXIST'","request_id":"incident-7"}
{"ts": "...", "level": "INFO", "logger": "gold_pasal.api", "msg": "request finished", "request_id": "incident-7", "method": "GET", "path": "/api/catalog/items/GP-DOES-NOT-EXIST", "status": 404, "duration_ms": 0.8}
```

`grep` may also match the `/health` line if you sent `incident-7` there. That is still one id, two requests; send the header only on the 404 curl if you want a single log hit.

4. OpenAPI has both operational paths:

```bash
curl -s http://127.0.0.1:8000/openapi.json | python3 -c "import json,sys; p=json.load(sys.stdin)['paths']; print('/health' in p, '/ready' in p)"
```

```text
True True
```

5. CI on `main` (after the observability PR is merged):

```bash
gh run list --limit 1
```

The latest `application-ci` run should show `verify` and `integration` success. `gh run view --log` if you need the `7 passed` line again.

## Incident note

Create `incident.md` in `gold-pasal` (or a gist). Ten lines is enough. No tokens, no `DATABASE_URL`, no `.env` paste.

```markdown
# incident-7 (practice 404)

When: <today>
Impact: GET /api/catalog/items/GP-DOES-NOT-EXIST returned 404. No checkout, no hold.
Id: incident-7 (client header, x-request-id, problem.request_id, log line).
Cause: SKU not in catalog. Expected.
Follow-up: none for this SKU. If a real missing item was sold in store, seed it as staff.
Not this: no traceback in the body; /health still 200; /ready still 200.
```

Commit it only if you want it in the repo; it is not required. Do not commit `/tmp/gold-pasal.log`.

## Failure drill

Turn the 404 into a leak on purpose, then put it back.

In `unknown_sku`, temporarily set `detail=traceback.format_exc()` (and `import traceback`). Rerun the missing-SKU curl. The body contains `traceback`. The course check fails. Restore `detail=str(exc)` and rerun. The word is gone.

Second drill: comment out `install_request_context(app)`, restart, curl health with `acceptance-trace-42`. The `x-request-id` header is missing. Restore the call.

Third drill: stop Compose (`docker compose stop db`) with uvicorn still running against `DATABASE_URL`. `GET /ready` should be 503 problem details. `GET /health` should still be 200. Start the database again.

## Interview defense

A reviewer may ask why `/health` and `/ready` are different, why the request id is middleware instead of a health-only header, and why inventory tests are a second CI job. Short answers: liveness vs dependencies; every status code needs the id, including 404; `verify.sh` must stay fast on a laptop without Docker.

They may ask rebase vs merge. Short answer: rebase a short unshared branch so `main` stays linear; do not rebase commits other people have based work on; revert on `main` instead of rewriting it.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Echo missing | Middleware not registered | [Echo X-Request-ID](05-echo-x-request-id) |
| 404 JSON without `request_id` | `problem_response` not receiving `request` | [Add /ready and safe 404s](06-add-ready-and-safe-404s) |
| `grep` finds nothing | Logs still uvicorn prose, or you grepped the wrong file | [Structured JSON logs](07-structured-json-logs); `2> /tmp/gold-pasal.log` |
| `traceback` in the 404 body | `debug=True` or `format_exc` in `detail` | Domain message only |
| `integration` job missing | CI file not merged | [Run integration tests in CI](04-run-integration-tests-in-ci) |
| verify red on ruff | Unformatted observability module | `uv run ruff format src tests` |

## Practice

<LessonQuiz
  question="The R6 course check sends X-Request-ID: acceptance-trace-42 to GET /health. What must the response include?"
  a="Authorization echoed back"
  b="x-request-id equal to acceptance-trace-42"
  c="A Python traceback"
  d="Set-Cookie"
  correct="b"
>

The client supplies the id; middleware copies it. Health does not generate a different UUID for that request.

</LessonQuiz>

[R7](/releases/r7/) puts this same process in a container. Stay on a branch when you start it.

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="incident-7 on header, problem JSON, and log line; /ready in OpenAPI; verify plus inventory green"
  invariant="You diagnose from a request id and problem details, not from guessing which access line matches."
/>
