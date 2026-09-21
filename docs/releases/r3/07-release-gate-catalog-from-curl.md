---
id: r3-07
title: "Release gate: catalog from curl"
release: r3
order: 7
prerequisites: [r3-06]
outcomes:
  - Serve the app and show health, the OpenAPI paths, create, list, read, and the 422 problem from curl
  - Run tests/http and ./scripts/verify.sh green
  - Name where pricing, validation, storage, and error mapping each live
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="catalog manager"
  problem="pytest green on a laptop is not the demo. A reviewer will start the server, curl port 8000, and try to break it with a 19K ring."
  destination="Six curls answer exactly as tests/http says they will, verify.sh is green, and you can point at the file responsible for each answer."
/>

# Release gate: catalog from curl

A checklist. Start the server in one terminal and run the curls in another. Every expected output below was also asserted by `tests/http` on the previous page; the curls are for the reviewer who will not open pytest.

## See the idea first

1. From `gold-pasal`, start the server:

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000
```

2. Health and the contract:

```bash
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:8000/openapi.json | python3 -c "import json,sys; print(sorted(json.load(sys.stdin)['paths']))"
```

```text
{"service":"gold-pasal","status":"ok"}
['/api/catalog/items', '/api/catalog/items/{sku}', '/health']
```

3. Create a ring and find it by karat:

```bash
curl -s -i -X POST http://127.0.0.1:8000/api/catalog/items \
  -H "content-type: application/json" \
  -d '{"sku":"GP-RING-DEMO","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}' | head -1
curl -s "http://127.0.0.1:8000/api/catalog/items?karat=22&limit=20"
```

```text
HTTP/1.1 201 Created
{"items":[{"sku":"GP-RING-DEMO","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}]}
```

4. Read it by SKU, then ask for one that does not exist:

```bash
curl -s http://127.0.0.1:8000/api/catalog/items/GP-RING-DEMO
curl -s -i http://127.0.0.1:8000/api/catalog/items/GP-NOPE | head -1
```

```text
{"sku":"GP-RING-DEMO","name":"Sajilo 22K Ring","metal":"gold","karat":22,"weight_grams":"5.20"}
HTTP/1.1 404 Not Found
```

5. The 19K ring:

```bash
curl -s -i -X POST http://127.0.0.1:8000/api/catalog/items \
  -H "content-type: application/json" \
  -d '{"sku":"GP-RING-BAD","name":"Invalid purity ring","metal":"gold","karat":19,"weight_grams":"5.20"}'
```

```text
HTTP/1.1 422 Unprocessable Entity
content-type: application/problem+json

{"type":"https://gold-pasal.example/problems/invalid-purity","title":"Invalid purity","status":422,"detail":"karat must be one of 14, 18, 22, 24; got 19"}
```

Then confirm it was never stored:

```bash
curl -s -i http://127.0.0.1:8000/api/catalog/items/GP-RING-BAD | head -1
```

```text
HTTP/1.1 404 Not Found
```

6. Stop the server with `Ctrl-C` and run the gate:

```bash
uv run pytest tests/http -q
./scripts/verify.sh
```

`9 passed` for the HTTP suite. Then `All checks passed!`, `0 errors`, and the whole suite green: R0 counter, R1 quote and CLI, R2 domain and invariants, R3 HTTP. Around forty-five tests.

## Where each answer comes from

| Curl | Answered by |
| --- | --- |
| `/health` JSON | `create_app` in `api/app.py`; `Health` schema |
| `/openapi.json` paths | generated from the router and signatures; nothing hand-written |
| `201` and the echoed body | `ItemCreate` validation, `CatalogItem` construction, `InMemoryCatalog.add`, `ItemRead.from_domain` |
| `karat=22` filter | `InMemoryCatalog.list_items`, an integer compare |
| `404` problem | `UnknownSkuError` from `catalog.get`, mapped in `api/problems.py` |
| `422` problem for 19K | `Purity.__post_init__` in `domain.py`, mapped in `api/problems.py` |

Say out loud, once: pricing still lives in `gold_pasal.pricing`. The API stores karat and grams and never recomputes Maya's total. R3 has no `/quote` endpoint on purpose; the CLI is the quote surface until a release needs another.

## Failure drill

Comment out `register_problem_handlers(app)` in `create_app`, restart uvicorn, and repeat step 5. You should see `500 Internal Server Error` and a traceback in the server terminal. Put the line back. Then run `uv run pytest tests/http -q` with the line still commented out: four tests fail, naming the four problem responses. The tests and the curls agree about what the handlers are for.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `/openapi.json` lacks `/api/catalog/items` | Router not included | `app.include_router(catalog_router)` in the factory |
| `{"items":[]}` after the POST | uvicorn restarted between curls | Same server for POST and GET; in-memory is expected until R4 |
| `422` without `application/problem+json` | Handlers not registered | `register_problem_handlers(app)` |
| `500` for karat 19 | Same | Same |
| `GP-RING-BAD` readable after the 422 | Item stored before validation | `Purity(...)` is built before `catalog.add(...)`; check the order in `create_item` |
| `verify.sh` red on `tests/http` only | `httpx2` missing in the dev group | `uv add --group dev httpx2` |

## Practice

<LessonQuiz
  question="A reviewer POSTs karat 19, gets 422, then GETs /api/catalog/items/GP-RING-BAD. What must they see?"
  a="200 with the ring, because the POST body was parsed"
  b="404 application/problem+json, because Purity(19) raised before catalog.add ran"
  c="422 again"
  d="500"
  correct="b"
>

`create_item` builds the domain `CatalogItem` first; `Purity(19)` raises there, and `catalog.add` is never reached. A rejected body leaves no trace, which is what the 404 proves.

</LessonQuiz>

R4 gives this catalog a database: `PostgresCatalog` behind the same `CatalogRepository`, Alembic for the schema, and `/api/inventory/holds` where two customers race for one necklace.

<EvidenceCard
  command="uv run pytest tests/http -q && ./scripts/verify.sh"
  artifact="six curls against uvicorn matching tests/http; full suite green"
  invariant="The documented catalog contract is what the process serves, and a 19K ring is never stored"
/>
