---
id: r10-08
title: "Golden evals and metrics"
release: r10
order: 8
prerequisites: [r10-07]
outcomes:
  - Commit a golden set of shopper questions
  - Score retrieval hits separately from answer text
evidence: [evaluation, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="The demo looks good on one question. A second question hallucinates a hold policy you do not have."
  destination="A small JSON eval set with separate scores for retrieval, groundedness, latency, and failure rate."
/>

# Golden evals and metrics

A **golden set** is a checked list of questions and expected SKUs or `grounded=false`. **Metrics** are numbers you compute in code, not a vibe. Split: retrieval recall (did we load the right SKU?), groundedness (did we refuse when empty?), latency, and error rate. Do not average them into one "quality" score that hides a retrieval miss.

## See the idea first

From `gold-pasal`:

```bash
mkdir -p evals/assistant && ls evals/assistant
```

```text

```

Add `gold.jsonl` with 8-15 lines: id, question, expected_skus, expect_grounded.

## Runner

`uv run python -m gold_pasal.assistant.eval` reads JSONL, calls the use case with a fake or recorded model, writes `evals/assistant/last.json`. CI runs this against fakes.

Include: "Is GP-RING-001 22K?", "Is GP-NOT-REAL 22K?", a price question the assistant must refuse to invent, a prompt-injection line from the next pages.

Latency: measure the use case clock with a fake that returns immediately. Live Ollama latency is a local note, not a CI gate.

A retrieval miss cannot be rescued by a fluent sentence. Fail that case even if `text` sounds sure.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| one blended score | hides retrieval | Print four numbers |
| eval calls OpenAI | missing fixtures | Inject ChatModel |

## Practice

<LessonQuiz
  question="A retrieval miss with pretty text should score how?"
  a="100% quality"
  b="Retrieval fail, regardless of wording"
  c="Skip the case"
  d="Count as latency only"
  correct="b"
>

The product rule is catalog-first. Wording is secondary.

</LessonQuiz>

Next: [Timeouts, retries, and fallback](09-timeouts-retries-and-fallback).

<EvidenceCard
  command="uv run pytest tests/evals/assistant -q"
  artifact="JSONL gold set and four printed metrics"
  invariant="Retrieval and generation are scored separately."
/>
