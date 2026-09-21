---
id: r12-03
title: "Typed tools and catalog search"
release: r12
order: 3
prerequisites: [r12-02]
outcomes:
  - Advertise catalog_search with a JSON Schema
  - Implement the call via the API
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP integrator"
  problem="tools/list is empty. The client cannot search the catalog."
  destination="tools/list includes catalog_search. tools/call hits GET /api/catalog."
/>

# Typed tools and catalog search

`tools/list` returns names, descriptions, and input schemas. `catalog_search` takes `q` or `karat`. Implementation: HTTP GET you already have. Reuse the same httpx client Settings as the agent if you can, but MCP must not import the agent loop.

## See the idea first

From `gold-pasal`:

```bash
curl -s 'http://127.0.0.1:8000/api/catalog?karat=22' | head -c 80
```

```text
[
```

The API must be running for a live Inspector demo. Tests use ASGI or respx.

## Schema

```json
{
  "name": "catalog_search",
  "inputSchema": {
    "type": "object",
    "properties": {
      "q": {"type": "string"},
      "karat": {"type": "integer"}
    },
    "additionalProperties": false
  }
}
```

Unknown karat values: let the API return 422 and map that to a protocol error on a later page. Do not range-check in two places unless the protocol must fail before HTTP.

Read-only. No holds on this page.

## Description text

Tool descriptions are for the model. Keep them short: "Search the Gold Pasal catalog by karat or text. Does not create holds." Do not paste DISCOVERY.md. Do not say "you may confirm holds yourself."

## Empty result

Zero rows is a valid tool result, not an error. Return an empty list as JSON text. The model may then stop or ask a narrower question. Do not turn empty search into a protocol error; that is how clients think the server is broken.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| search uses SQL | duplicate | HTTP |
| additionalProperties omitted | model extra keys | set false |

## Practice

<LessonQuiz
  question="What does catalog_search call?"
  a="psql"
  b="The existing catalog HTTP API"
  c="Ollama"
  d="kind"
  correct="b"
>

One catalog.

</LessonQuiz>

Next: [Resources and prompts](04-resources-and-prompts).

<EvidenceCard
  command="uv run pytest tests/mcp/test_catalog_search.py -q"
  artifact="tools/list entry and a call fixture"
  invariant="Search is read-only and API-backed."
/>
