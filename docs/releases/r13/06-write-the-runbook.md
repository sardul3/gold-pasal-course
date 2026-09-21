---
id: r13-06
title: "Write the runbook"
release: r13
order: 6
prerequisites: [r13-05]
outcomes:
  - Write start, stop, and failure tables
  - Include rollback: GOLD_PASAL_CATALOG_BACKEND=postgres
evidence: [runbook]
---

<LessonMission
  role="forward-deployed engineer"
  problem="You are the only person who knows the start order: mock API, sync, uvicorn, demo flag."
  destination="customer/mandala/RUNBOOK.md starts the demo cold and lists 429 and CSV duplicate failures."
/>

# Write the runbook

A **runbook** is what you follow at 2am or on a sales call. Commands, expected output, what to do when Mandala 429s, when CSV duplicates collide, when the assistant kill switch is on.

## See the idea first

From `gold-pasal`:

```bash
ls customer/mandala/DISCOVERY.md
```

```text
customer/mandala/DISCOVERY.md
```

Add RUNBOOK.md beside it. Do not duplicate the whole course.

## Must include

1. Start Mandala mock
2. `.env` keys needed (placeholders)
3. `mandala-sync`
4. `GOLD_PASAL_DEMO=1` uvicorn
5. Open /demo
6. Kill switch and backend rollback

Failure table: 429, ok-false 200, duplicate item_code, Ollama down (assistant unavailable, catalog still lists).

The runbook is part of the demo. Hand it to the stakeholder.

## Start order

Mandala mock first, then sync, then Gold Pasal API, then open /demo. If you start the API first, search is empty and the demo looks broken. Put that order in bold at the top of RUNBOOK.md.

## Who pages whom

If Ollama is down, the runbook says: catalog HTML still works, assistant badge shows unavailable, do not reboot Postgres first. Wrong first step is how demos lose five minutes. Put the decision tree in the failure table.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| commands only in your head | not transferable | Write the file |
| secrets in the runbook | use placeholders | Redact |

## Practice

<LessonQuiz
  question="What is the rollback if Mandala sync is wrong?"
  a="Delete kind"
  b="Point GOLD_PASAL_CATALOG_BACKEND back at postgres"
  c="Force-push main"
  d="Disable GitHub"
  correct="b"
>

Adapters are swappable. The core shop stays.

</LessonQuiz>

Next: [Record the stakeholder demo](07-record-the-stakeholder-demo).

<EvidenceCard
  command="test -f customer/mandala/RUNBOOK.md && wc -l customer/mandala/RUNBOOK.md"
  artifact="RUNBOOK.md with start and failure table"
  invariant="Someone else can start the demo from the runbook."
/>
