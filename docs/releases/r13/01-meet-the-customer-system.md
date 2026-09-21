---
id: r13-01
title: "Meet the customer system"
release: r13
order: 1
prerequisites: []
outcomes:
  - Start the mock customer stack
  - Write down auth, data, and error quirks
evidence: [commit]
---

<LessonMission
  role="forward-deployed engineer"
  problem="A fictional shop, Mandala Trails Outfitters, will not run Gold Pasal as-is. They have a CSV export and a quirky HTTP API."
  destination="You can run their mock system and list how it differs from Gold Pasal."
/>

# Meet the customer system

This release is the **forward-deployed** job: someone else's data, someone else's constraints. The mock lives under `customer/mandala/` in gold-pasal (or a sibling folder you document). It is intentionally messy: CSV with mixed gram/tola columns, an HTTP API that uses `X-Shop-Key` instead of bearer tokens, and 200 responses with `{ok: false}`.

## See the idea first

From `gold-pasal`:

```bash
ls customer/mandala || echo 'create the mock'
```

```text
create the mock
```

Add README, sample `export.csv`, and a tiny FastAPI or httpx-served fixture app on port 8010.

## What you meet

CSV columns: `item_code`, `wt`, `unit` (`g` or `tola`), `kt`, `desc`. Some `kt` values are `22K` with a letter. Duplicate `item_code` rows.

HTTP: `GET /legacy/items?code=` returns 200 always. Failures are `{ok:false, err:"missing"}`. Rate limit: 5 requests per 10 seconds, then 429 without Retry-After.

You do not rewrite Mandala. You integrate.

Gold Pasal remains the product. Mandala is the customer system.

## Why a mock

You cannot put a real jeweler's production database in a course. The mock is still "someone else's system" because you are not allowed to tidy the CSV. If you find yourself rewriting their column names in the file, you have stopped doing FDE work and started doing their rewrite.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| cleaning the CSV in place | you do not own their export | Adapt, do not edit source truth |
| no README | next page needs it | Write how to start the mock |

## Practice

<LessonQuiz
  question="Who owns Mandala's CSV format?"
  a="You, so you should normalize the file on disk"
  b="The customer; your adapter interprets it"
  c="Ollama"
  d="kind"
  correct="b"
>

FDE work leaves the messy system running.

</LessonQuiz>

Next: [Write the discovery note](02-write-the-discovery-note).

<EvidenceCard
  command="head -5 customer/mandala/export.csv"
  artifact="mock CSV plus a running quirky API"
  invariant="The customer system stays messy on purpose."
/>
