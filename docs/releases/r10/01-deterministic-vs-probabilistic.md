---
id: r10-01
title: "Deterministic vs probabilistic"
release: r10
order: 1
prerequisites: []
outcomes:
  - Draw the boundary between catalog reads and model text
  - Name the invariant for POST /api/assistant/answers
evidence: [commit]
---

<LessonMission
  role="assistant builder"
  problem="A shopper asks if GP-RING-001 is 22K. A model might say yes from memory while the catalog says 18K."
  destination="Catalog facts win. The model may phrase them. Python decides whether evidence exists."
/>

# Deterministic vs probabilistic

A **deterministic** step returns the same result from the same stored facts: `karat == 22` is true or false. A **probabilistic** step samples likely text. Gold Pasal already prices in Python. The assistant may not invent stock, karat, or price.

## See the idea first

From `gold-pasal`:

```bash
curl -s http://127.0.0.1:8000/api/catalog/GP-RING-001 | head -c 200 || echo 'start the API'
```

```text
{"sku":"GP-RING-001","karat":22,...}
```

If the SKU differs, use one you actually seeded. The catalog row is the source of truth for the next eleven pages.

## The product rule

`POST /api/assistant/answers` will later return JSON with `grounded` (bool), `sources` (SKU list), and `text`. If retrieval finds no row, `grounded` is false and `sources` is empty. Fluent prose cannot flip that.

Write a failing test that calls the answers use case with a fake catalog containing GP-RING-001 at 22K and a fake model that says "18K". The test should expect the API to refuse or to rewrite from the catalog, depending on the design you pick on the structured-output page. Do not implement the model call yet.

Keep quote math in `pricing.py`. The assistant never recomputes NPR.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| catalog 404 | seed missing | Use a SKU from R4 seed |
| urge to skip the test | page feels conceptual | The failing test is the work |

## Practice

<LessonQuiz
  question="If the model says 18K and the catalog says 22K, who wins?"
  a="The model, because it is newer"
  b="The catalog row"
  c="The average"
  d="Whichever string is longer"
  correct="b"
>

Deterministic product data wins. The model is a speaker, not a ledger.

</LessonQuiz>

Next: [Ollama behind a Protocol](02-ollama-behind-a-protocol).

<EvidenceCard
  command="curl -s http://127.0.0.1:8000/api/catalog/GP-RING-001"
  artifact="failing test that encodes catalog-wins"
  invariant="Probabilistic text cannot override catalog truth."
/>
