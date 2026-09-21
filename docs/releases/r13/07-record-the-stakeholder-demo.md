---
id: r13-07
title: "Record the stakeholder demo"
release: r13
order: 7
prerequisites: [r13-06]
outcomes:
  - Follow a script that a non-engineer can follow
  - Show a safe failure on camera
evidence: [demo]
---

<LessonMission
  role="forward-deployed engineer"
  problem="The integration works. The recording rambles through pytest."
  destination="A 5-8 minute recording: problem, mapping, live UI, one failure, runbook pointer."
/>

# Record the stakeholder demo

Stakeholders need the story, not the test names. Script: Mandala CSV is messy; we did not rewrite it; search on /demo; assistant refuses a fake SKU; hold asks for confirm; 429 message if you trigger it. Point at DISCOVERY.md and RUNBOOK.md. No CI deep-dive.

## See the idea first

From `gold-pasal`:

```bash
test -f customer/mandala/RUNBOOK.md && echo ready
```

```text
ready
```

Use whatever recorder you have. Commit a DEMO.md script with timestamps, not the video binary.

## Script (DEMO.md)

0:00 who they are and what hurts  
1:00 mapping table  
2:00 /demo search  
3:30 assistant unknown SKU  
5:00 confirm hold  
6:00 one failure (429 or kill switch)  
7:00 where the runbook lives  

Do not claim Mandala is production. It is a mock. Honesty is the point.

Portfolio polish (resume, system-design rehearsal) is R14.

## Audio

Say "this is a mock of Mandala Trails" in the first thirty seconds. Do not imply you deployed into a real store. Hiring managers watch for that honesty. Cut the recording if you spent two minutes on pytest names.

## Resolution

Record the browser, not the IDE. Zoom the HTMX table so karat and SKU are readable. If you must show DISCOVERY.md, show the mapping table only, then go back to the UI. Stakeholders remember the table, not your editor theme.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| 20 minute pytest tour | wrong audience | Follow DEMO.md |
| invented customer quotes | honesty | Stay on the mock |

## Practice

<LessonQuiz
  question="Who is the recording for?"
  a="Only a staff SRE"
  b="A non-engineer stakeholder"
  c="The kind control plane"
  d="GHCR"
  correct="b"
>

Forward-deployed work is explained to the customer.

</LessonQuiz>

Next: [Release gate: customer integration](08-release-gate-customer-integration).

<EvidenceCard
  command="test -f customer/mandala/DEMO.md"
  artifact="DEMO.md script plus a recording you keep off git if it is large"
  invariant="The demo matches the runbook."
/>
