---
id: r11-02
title: "Typed tools via the API"
release: r11
order: 2
prerequisites: [r11-01]
outcomes:
  - Define search, get_order, and propose_hold tools
  - Implement them as HTTP clients to Gold Pasal
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="The prototype agent SQL-selects catalog_items. It now disagrees with the API on which rings are holdable."
  destination="Tools are JSON-schema functions that call the existing HTTP API, not the database."
/>

# Typed tools via the API

A **tool** is a named function with a JSON Schema the model must fill. The harness validates arguments, then your code calls `GET /api/catalog` or `POST /api/holds`. Duplicating domain rules in the agent is how you get a second, worse shop.

## See the idea first

From `gold-pasal`:

```bash
curl -s http://127.0.0.1:8000/openapi.json | head -c 120
```

```text
{"openapi":"3.1.0","info":{"title":"Gold Pasal"
```

OpenAPI is the contract. Tool schemas should be thinner, not a second domain.

## Three tools

- `search_catalog(karat: int | None, q: str | None)` -> GET list
- `get_order(order_id: str)` -> GET order, staff token
- `propose_hold(sku: str)` -> does not POST yet; returns a preview. The next pages add confirmation before POST.

Use httpx.AsyncClient against the same base URL as the shop. Pass the staff bearer token from Settings. Tests use the in-process ASGI app or respx, not a live network in CI.

Schema: reject additional properties. Enums for karat if you have them.

## Staff token

The agent process uses the staff bearer token from Settings, the same role as a human staff client. It is not the customer token. Confused-deputy tests later try to smuggle a token in catalog text; this page just makes the client honest.

Do not give the agent a database URL. HTTP is the boundary that already has authz.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| tool opens SQLAlchemy | domain duplicate | HTTP only |
| additionalProperties true | model invents fields | reject unknown keys |

## Practice

<LessonQuiz
  question="Where do hold rules live?"
  a="In the prompt"
  b="In the Gold Pasal API"
  c="In Ollama"
  d="In the MCP inspector"
  correct="b"
>

Tools are clients. The API remains the shop.

</LessonQuiz>

Next: [Budgets and allowlists](03-budgets-and-allowlists).

<EvidenceCard
  command="uv run pytest tests/agent/test_tools.py -q"
  artifact="three schemas and HTTP implementations"
  invariant="Tools do not duplicate pricing or hold invariants."
/>
