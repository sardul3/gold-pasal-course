---
id: r13-04
title: "Point assistant and MCP at it"
release: r13
order: 4
prerequisites: [r13-03]
outcomes:
  - Include MT- SKUs in retrieval tests
  - Show MCP search hitting the adapter data
evidence: [commit, ci-run]
---

<LessonMission
  role="forward-deployed engineer"
  problem="The assistant still answers only GP-RING-001. The customer demo is about MT- items."
  destination="Retrieval, agent search, and MCP catalog_search return Mandala-mapped SKUs."
/>

# Point assistant and MCP at it

Do not copy tools. Point the existing catalog repository at data that includes synced Mandala items. Evals get two new gold questions about an MT SKU. Injection still forced-false.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/evals/assistant -q | tail -1
```

```text
... passed
```

Add questions; keep the old GP- cases.

## Wiring

Settings: `GOLD_PASAL_CATALOG_BACKEND=postgres|mandala`. Default postgres for the core shop. Demo uses mandala after sync.

Agent search_catalog already lists via API; once the API reads the adapter, tools work. MCP too.

If a Mandala description tries injection, R10 harness still wins.

## Backend flag

Default `postgres` so R0-R12 learners who skip Mandala still have a shop. The capstone demo exports `GOLD_PASAL_CATALOG_BACKEND=mandala` in the runbook. Tests parametrize both or isolate Mandala tests with a marker.

## SKU prefix

Retrieval regex that only looks for `GP-` will miss `MT-`. Update it. Add a test that a question containing `MT-041` loads that row. This is the kind of small miss that makes a stakeholder demo look like the product "does not see our catalog."

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| second assistant stack | duplicate | Reuse ChatModel |
| evals only GP- | demo gap | Add MT- cases |

## Practice

<LessonQuiz
  question="How do MCP tools see Mandala items?"
  a="A new MCP server copy"
  b="The same API, now backed by the adapter"
  c="Reading CSV from the client"
  d="Ollama memory"
  correct="b"
>

One API. Many adapters.

</LessonQuiz>

Next: [Serve an HTMX demo](05-serve-an-htmx-demo).

<EvidenceCard
  command="uv run pytest tests/evals/assistant tests/mcp -q"
  artifact="MT- gold cases green"
  invariant="Customer data does not fork the AI stack."
/>
