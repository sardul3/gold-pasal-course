---
id: r13-02
title: "Write the discovery note"
release: r13
order: 2
prerequisites: [r13-01]
outcomes:
  - Write customer/mandala/DISCOVERY.md
  - Get the mapping table on paper before code
evidence: [runbook]
---

<LessonMission
  role="forward-deployed engineer"
  problem="You started coding the adapter before listing constraints. Half of the 429 behavior is about to be a surprise in the demo."
  destination="A one-page discovery note: goals, constraints, data mapping, non-goals, risks."
/>

# Write the discovery note

**Discovery** is a write-up a non-engineer can read. Sections: what they want (show catalog + hold via Gold Pasal), constraints (no change to their API this week, 429s, no bearer), mapping (`item_code` to SKU prefix `MT-`), non-goals (no payments through Mandala), risks (duplicate rows).

## See the idea first

From `gold-pasal`:

```bash
ls customer/mandala/DISCOVERY.md || echo 'write it'
```

```text
write it
```

Keep it under about a page. No architecture novel.

## Mapping table

| Mandala | Gold Pasal |
| --- | --- |
| item_code | sku `MT-{code}` |
| wt + unit tola | grams via R1 tola constant |
| kt 22K | karat 22 |
| desc | description, untrusted text |

Auth: store `X-Shop-Key` in Settings for the adapter, not in the browser.

Call out that catalog descriptions may contain injection strings; R10 rules still apply.

This note is evidence. A reviewer should understand the job without reading the adapter yet.

## Auth paragraph

Mandala's `X-Shop-Key` is not a user identity. It is a shared shop credential. Gold Pasal still uses bearer roles for its own API. The adapter holds the shop key. The HTMX demo authenticates to Gold Pasal as staff. Write that split so nobody pastes the shop key into a browser.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| empty non-goals | scope will swell | Name payments and rewriting Mandala as out |
| secret key in the markdown | leak | Placeholder only |

## Practice

<LessonQuiz
  question="What belongs in discovery before the adapter?"
  a="A Kubernetes operator"
  b="Constraints, mapping, non-goals"
  c="The OpenAI bill"
  d="Argo CD"
  correct="b"
>

FDE work starts with their world, not your YAML.

</LessonQuiz>

Next: [Build the customer adapter](03-build-the-customer-adapter).

<EvidenceCard
  command="wc -l customer/mandala/DISCOVERY.md"
  artifact="DISCOVERY.md with a mapping table"
  invariant="Non-goals are written down."
/>
