---
id: r11-06
title: "Trace without leaking secrets"
release: r11
order: 6
prerequisites: [r11-05]
outcomes:
  - Emit a step trace
  - Redact tokens and obvious secrets
evidence: [evaluation]
---

<LessonMission
  role="staff assistant operator"
  problem="A trace dump includes the staff bearer token and the shopper's phone number from a tool result."
  destination="Traces record step, tool, latency, and redacted payloads."
/>

# Trace without leaking secrets

A **trace** is one record per step: run id, index, tool name, duration, token counts if any, status. Redact `Authorization`, `token`, `password`. Truncate large catalog dumps. You need traces to debug; you do not need secrets in them.

## See the idea first

From `gold-pasal`:

```bash
rg Authorization src/gold_pasal/agent || true
```

```text

```

If that hits a log line, fix it on this page.

## Record

Write JSON lines to stdout (R6 structured logs) with `run_id` and `step`. Tests assert a fake token does not appear in captured logs.

Do not log full prompts that contain PII. Log prompt_version and hash of the user text if you need correlation.

OpenTelemetry is optional. JSON lines are enough for the gate.

## Grep drill

Trigger one run. Copy `run_id`. `rg run_id` on the JSON logs should show each step. Then `rg dev-staff` on the same logs must miss. If it hits, you logged the Authorization header. Fix before R12, because MCP will add another client token.

## Token counts

If the OpenAI adapter returns `usage`, log prompt tokens and completion tokens next to `run_id`. That is cost evidence for an FDE conversation. Do not log the full prompt. A hash of the user text is enough to join a complaint to a run.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| token in caplog | missing redact | Filter keys |
| no run_id on logs | cannot grep an incident | Add it |

## Practice

<LessonQuiz
  question="What must never appear in agent traces?"
  a="Tool names"
  b="Bearer tokens and passwords"
  c="Step index"
  d="Latency"
  correct="b"
>

R6 already greps logs by request id. Do not put secrets in that stream.

</LessonQuiz>

Next: [Golden trajectories](07-golden-trajectories).

<EvidenceCard
  command="uv run pytest tests/agent/test_trace_redact.py -q"
  artifact="redaction test on captured logs"
  invariant="Traces are safe to store."
/>
