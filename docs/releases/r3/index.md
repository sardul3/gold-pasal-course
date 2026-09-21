---
title: "R3: HTTP APIs with FastAPI"
description: "A documented catalog API with validated bodies, problem details, and in-process tests."
---

# R3: HTTP APIs with FastAPI

**What you'll have:** the catalog behind HTTP. A FastAPI application that serves `/health`, creates and lists catalog items with validated JSON bodies, answers every expected failure with a problem-details document, is wired through dependency injection to the `CatalogRepository` port from R2, and is tested in-process with HTTPX.

<LessonMission
  role="catalog manager"
  problem="Sita cannot paste Python into the counter tablet. She needs HTTP: create a 22K SKU, find it again by karat, and get a readable error when someone types 19K."
  destination="uvicorn serves GET /health, POST and GET /api/catalog/items, GET /api/catalog/items/{sku}; a 19K body returns 422 application/problem+json; /openapi.json documents all of it; tests/http proves it without a running port."
/>

## Before you start

You finished [R2](/releases/r2/): `domain.py` holds `Money`, `Weight`, `Purity`; `catalog.py` holds `CatalogItem`, the `CatalogRepository` Protocol, and `InMemoryCatalog`; `tests/unit` is green with Hypothesis installed. Prove it from `gold-pasal`:

```bash
uv run python -c "from gold_pasal.catalog import CatalogRepository, InMemoryCatalog; print('ports ready')"
uv run pytest tests/unit -q | tail -1
```

```text
ports ready
25 passed in 0.40s
```

The API on these pages asks for `CatalogRepository` and never imports `InMemoryCatalog` in a route. Pricing stays in `gold_pasal.pricing`; the API stores karat and grams and never recomputes Maya's total.

## Guide

| Page | You will be able to |
| --- | --- |
| [HTTP and the first FastAPI app](01-http-and-the-first-fastapi-app) | run uvicorn, read a request and response, open `/docs` |
| [Pydantic models and request bodies](02-pydantic-models-and-request-bodies) | accept a JSON body, validate it, return 201 |
| [Path and query parameters](03-path-and-query-parameters) | read one item by SKU, filter a list by karat with a bounded limit |
| [Errors and problem details](04-errors-and-problem-details) | turn every expected failure into RFC 9457 problem JSON |
| [Dependency injection and routers](05-dependency-injection-and-routers) | give routes a repository with `Depends`, split files with `APIRouter` |
| [Test the API with HTTPX](06-test-the-api-with-httpx) | drive the app in-process with `TestClient` and assert the contract |
| [Release gate: catalog from curl](07-release-gate-catalog-from-curl) | show the four curls a reviewer will run |

## Release evidence

From `gold-pasal`:

```bash
uv run pytest tests/http -q
uv run uvicorn gold_pasal.api.app:app --port 8000
```

R4 replaces `InMemoryCatalog` behind the same `CatalogRepository` port with PostgreSQL and adds `/api/inventory/*`.
