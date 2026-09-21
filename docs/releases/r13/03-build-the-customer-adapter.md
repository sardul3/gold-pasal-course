---
id: r13-03
title: "Build the customer adapter"
release: r13
order: 3
prerequisites: [r13-02]
outcomes:
  - Implement the adapter
  - Test CSV unit conversion and 200-ok-false errors
evidence: [commit, ci-run]
---

<LessonMission
  role="forward-deployed engineer"
  problem="Gold Pasal CatalogRepository only knows Postgres. Mandala data is CSV plus HTTP."
  destination="A MandalaCatalog adapter behind the existing Protocol, with tests on fixtures."
/>

# Build the customer adapter

Reuse `CatalogRepository` from R2/R4. The adapter reads CSV at startup or on a sync command, and refreshes via HTTP when you choose. Map `{ok:false}` to your domain errors. Do not fork the Protocol.

## See the idea first

From `gold-pasal`:

```bash
rg CatalogRepository src/gold_pasal | head
```

```text
...
```

Add src/gold_pasal/adapters/mandala.py and tests/adapters/test_mandala.py.

## Tests first

Fixture CSV with one tola row and one gram row. Assert grams on the domain Weight. Fixture HTTP 200 `{ok:false}` -> not found, not a crash. Fixture 429 -> retry once then fail, matching R10 timeout style.

Sync command: `uv run gold-pasal mandala-sync` writes into your catalog table or a side table. Pick one, document in DISCOVERY.md. Idempotent on item_code.

Untrusted `desc` is stored as data. Do not eval it.

## Duplicate item_code

If two CSV rows share a code, pick a rule: last wins, or fail the sync. Write it in DISCOVERY.md and test it. Silent last-wins without a log line will bite the demo when the stakeholder asks why the weight changed.

## Timeouts

Mandala HTTP gets the same httpx timeout style as R10. A hung customer API must not hang /demo forever. 3s connect, 10s read is a start. Test with a respx transport that never responds until timeout.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| float for tola | use Decimal | R1 rule |
| adapter is a new unrelated class tree | fork | Implement the Protocol |

## Practice

<LessonQuiz
  question="What does the adapter implement?"
  a="A new global inventory theory"
  b="CatalogRepository (or a narrow sync port you document)"
  c="MCP from scratch"
  d="kind Ingress"
  correct="b"
>

Same shop ports, new implementation.

</LessonQuiz>

Next: [Point assistant and MCP at it](04-point-assistant-and-mcp-at-it).

<EvidenceCard
  command="uv run pytest tests/adapters/test_mandala.py -q"
  artifact="adapter plus fixture tests"
  invariant="Mandala quirks stay at the adapter edge."
/>
