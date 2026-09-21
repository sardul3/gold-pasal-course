---
id: r11-01
title: "Workflow or agent"
release: r11
order: 1
prerequisites: []
outcomes:
  - Name a Gold Pasal flow that must stay a script
  - Name one staff task that needs observe-decide-act
evidence: [commit]
---

<LessonMission
  role="staff assistant operator"
  problem="Someone wants an agent to 'handle holds.' The hold path is already POST /api/holds with an idempotency key."
  destination="You can say when a script is enough and when a bounded agent is justified."
/>

# Workflow or agent

A **workflow** (or script) is a known sequence: create hold, then checkout. An **agent** is a model in a loop with tools, state, and a stop condition. Prefer the script when the control flow is known. Gold Pasal checkout is a script. "Find a 22K ring near 5 g and propose a hold" may need a loop because the next search depends on what came back.

## See the idea first

From `gold-pasal`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/ready
```

```text
200
```

The API from R9 is up. You will not add tools on this page.

## Decision

Write `docs/agent.md` in gold-pasal with two bullets:

- Script: `POST /api/orders` with Idempotency-Key (R5). No model.
- Agent: staff natural language that may search, then maybe hold, then stop for confirmation.

If you can draw the flowchart without a model, do not add an agent. R11 exists because staff questions are not a flowchart.

Stop conditions later are code: max steps, deadline, approval. "The model will notice it is done" is not a stop condition.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| replacing checkout with an agent | scope creep | Leave R5 as the source of truth |
| no docs/agent.md | skipped the artifact | Write the two bullets |

## Practice

<LessonQuiz
  question="Should checkout become an agent loop?"
  a="Yes, always"
  b="No; it is a known sequence with idempotency"
  c="Only on kind"
  d="Only with OpenAI"
  correct="b"
>

Known control flow stays a script. Agents are for observation-dependent steps.

</LessonQuiz>

Next: [Typed tools via the API](02-typed-tools-via-the-api).

<EvidenceCard
  command="cat docs/agent.md"
  artifact="two-bullet decision note"
  invariant="Do not put a model in front of replay-safe checkout."
/>
