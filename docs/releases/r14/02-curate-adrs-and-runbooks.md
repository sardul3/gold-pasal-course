---
id: r14-02
title: "Curate ADRs and runbooks"
release: r14
order: 2
prerequisites: [r14-01]
outcomes:
  - Keep 3-6 ADRs that are actually decisions
  - Index runbooks in README
evidence: [adr, runbook]
---

<LessonMission
  role="job candidate"
  problem="Decisions are scattered in chat logs. The Mandala runbook is the only operational doc."
  destination="A small ADR set plus links to kind, delivery, assistant, and Mandala runbooks."
/>

# Curate ADRs and runbooks

An **ADR** records a hard-to-reverse choice: Postgres, bearer tokens, Ollama default plus OpenAI adapter, kind not homelab, HTMX demo. Do not write an ADR for every function. Link R8 RUNBOOK, R9 smoke, R13 RUNBOOK from the README.

## See the idea first

From `gold-pasal`:

```bash
ls docs/adr 2>/dev/null || ls docs/decisions 2>/dev/null || echo 'add docs/adr'
```

```text
add docs/adr
```

In gold-pasal, use docs/adr/. This course repo already has its own decisions; do not copy them in.

## ADRs worth keeping

- Decimal money
- Hold uniqueness
- ChatModel Protocol and CI fixtures
- kind as the cluster
- Mandala as an adapter, not a fork

Each: context, options, decision, consequences. Short.

OpenAPI remains generated from the app. Commit a snapshot if you already do contract tests.

## One page index

`docs/adr/README.md` lists the ADRs in one table: number, title, one-line decision. Reviewers will not open seven files unprompted. The README of the repo links that table and the Mandala runbook in the same section.

## Dropped ADRs

If you wrote an ADR for a library you removed, mark it superseded in one line and leave it. Deleting history hides why the repo looks the way it does. Interviewers sometimes ask what you reversed.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| 20 ADRs of diaries | noise | Keep hard-to-reverse ones |
| runbook not linked | unfindable | README section |

## Practice

<LessonQuiz
  question="Which of these needs an ADR?"
  a="Renaming a test"
  b="Using a Protocol for ChatModel with CI fixtures"
  c="A CSS color"
  d="A log line wording"
  correct="b"
>

Vendor and test seams are costly to unwind.

</LessonQuiz>

Next: [Rehearse the system-design walkthrough](03-rehearse-the-system-design-walkthrough).

<EvidenceCard
  command="ls docs/adr"
  artifact="ADR index and README runbook links"
  invariant="Claims in interviews point at these files."
/>
