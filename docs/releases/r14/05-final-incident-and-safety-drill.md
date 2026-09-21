---
id: r14-05
title: "Final incident and safety drill"
release: r14
order: 5
prerequisites: [r14-04]
outcomes:
  - Run a rollback or ready incident
  - Re-run a confirmation fail-closed demo
evidence: [demo, runbook]
---

<LessonMission
  role="job candidate"
  problem="You can talk. A live drill still needs logs, rollback, and a refused hold."
  destination="One incident: /ready fail or bad digest, recover; one safety: agent or MCP hold without confirm."
/>

# Final incident and safety drill

Combine R6 request ids, R8/R9 rollback, R11 confirm. Pick one ops incident and one AI safety stop. Record commands in docs/DRILL.md.

## See the idea first

From `gold-pasal`:

```bash
./scripts/verify.sh | tail -1
```

```text
... passed
```

Do not break main permanently. Use a branch or undo.

## Ops

Break /ready (stop Postgres on Compose, or a bad digest on kind). Grep logs by x-request-id if HTTP is still up. Restore. Smoke.

## Safety

Agent or MCP hold without confirm. Prove no row. Then confirm and prove one row.

If Mandala is running, include a 429 in the drill or skip if timeboxed; say which in DRILL.md.

## Timebox

Twenty minutes wall clock: ten for ops, ten for safety. If kind is slow, use Compose /ready as the ops incident. The point is request ids plus restore, not a cluster trophy. Write which path you took in DRILL.md.

## Request id

For the HTTP incident, grep the same `x-request-id` in JSON logs that R6 taught. If you cannot, the observability release did not survive the later work. Fix logs before you claim the drill.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| drill only on slides | no commands | Paste actual output |
| left the shop broken | no undo | Restore before you stop |

## Practice

<LessonQuiz
  question="What two classes of drill belong here?"
  a="CSS and fonts"
  b="Operational recovery and an AI/tool safety stop"
  c="Only homelab network policies"
  d="Only resume adjectives"
  correct="b"
>

The course is backend plus safe AI.

</LessonQuiz>

Next: [Release gate: publish the portfolio](06-release-gate-publish-the-portfolio).

<EvidenceCard
  command="test -f docs/DRILL.md"
  artifact="DRILL.md with command output"
  invariant="You can recover and you can refuse an unsafe write."
/>
