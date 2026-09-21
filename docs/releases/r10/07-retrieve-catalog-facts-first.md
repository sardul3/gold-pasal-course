---
id: r10-07
title: "Retrieve catalog facts first"
release: r10
order: 7
prerequisites: [r10-06]
outcomes:
  - Retrieve by SKU or keyword before generation
  - Pass facts into the user message as data, not as new instructions
evidence: [commit, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="The model answers karat from pretraining. GP-RING-001 in your database was recast to 18K last week."
  destination="The use case loads catalog rows (and optional keyword search) before complete() is called."
/>

# Retrieve catalog facts first

**Retrieval** is ordinary database or search code. For a question that mentions `GP-RING-001`, load that row. For "22K rings under 8 grams", filter the catalog. You can add SQLite FTS or embeddings later; start with SKU lookup plus `ILIKE` on name. The comparison between keyword, FTS, and embeddings is one table in this page, not three extra lessons.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/unit/test_catalog.py -q | tail -1
```

```text
... passed
```

Reuse CatalogRepository. Do not open SQL in the assistant route.

## Order of operations

1. Parse the question for SKUs and constraints (simple regex or a dedicated parser; keep it tested)
2. `repo.get` / `repo.list_items`
3. If empty: `grounded=false`, skip the model or ask it only to apologize using a fixed template
4. If found: put JSON facts in the user message inside a fence: `CATALOG_FACTS: ...`
5. `await model.complete`

Keyword vs FTS vs embeddings: keyword is exact and cheap; FTS helps phrases; embeddings help paraphrase and fail on SKUs. This shop starts with keyword plus SKU. You may add FTS as an extra retriever behind a Protocol if tests show keyword misses a named style. Do not block the gate on vectors.

Injection comes in two pages. Treat retrieved text as data.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| model called with empty facts and grounded true | skipped the empty check | Short-circuit |
| SQL in the route | bypassed the repository | Call the port |

## Practice

<LessonQuiz
  question="When must complete() see catalog JSON?"
  a="Never; the model knows jewelry"
  b="After retrieval found rows you will cite"
  c="Only in CI"
  d="Only for OpenAI"
  correct="b"
>

No facts, no grounded answer. Retrieval is deterministic code.

</LessonQuiz>

Next: [Golden evals and metrics](08-golden-evals-and-metrics).

<EvidenceCard
  command="uv run pytest tests/unit/test_assistant_retrieve.py -q"
  artifact="retriever plus tests for SKU hit and miss"
  invariant="Generation is not allowed to invent a SKU."
/>
