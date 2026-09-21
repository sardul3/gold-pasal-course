---
id: r11-05
title: "Persist run state"
release: r11
order: 5
prerequisites: [r11-04]
outcomes:
  - Persist AgentRun rows
  - Resume confirm after restart
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="The process restarted. The only copy of awaiting_approval was in the chat window."
  destination="Run id, step index, tool results, and status live in Postgres (or sqlite for tests), not in chat history."
/>

# Persist run state

**Durable state** is a row you can SELECT. Chat history is a view. Store run id, status, steps (tool name, arguments hash, result hash), approval payload, and budget remaining. Do not store secrets or raw bearer tokens in the step log.

## See the idea first

From `gold-pasal`:

```bash
ls src/gold_pasal | head
```

```text
api  domain.py ...
```

Add a mapped class and Alembic revision. Tests can use the R4 inventory database URL.

## Shape

`agent_runs(id, status, created_at, deadline_at)` and `agent_steps(run_id, index, tool, arguments_json, result_json)`. arguments_json is schema-validated input, not free text from the model after you parse.

After restart, `GET /api/agent/runs/{id}` returns awaiting_approval still. Confirm still works.

Do not treat the OpenAI conversation array as the source of truth.

## What not to persist

Do not store the raw model completion in Postgres if it might contain secrets the model echoed. Store the parsed action (tool name + validated args). Chat transcripts can live in an object store later; they are not required for confirm-after-restart.

## Migration

Name the Alembic revision after the feature, not `add_stuff`. Downgrade should drop the two tables. Tests that use the inventory database URL must run `alembic upgrade head` in the fixture you already have from R4, or the agent tables will be missing and persist tests will look like product bugs.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| state only in memory | lost on restart | Write the row before returning to staff |
| token in result_json | logged Authorization | Redact |

## Practice

<LessonQuiz
  question="After a process restart, where is awaiting_approval?"
  a="Gone"
  b="In the agent_runs row"
  c="In Ollama's RAM"
  d="In the VitePress site"
  correct="b"
>

Durable state is your database.

</LessonQuiz>

Next: [Trace without leaking secrets](06-trace-without-leaking-secrets).

<EvidenceCard
  command="uv run pytest tests/agent/test_persist.py -q"
  artifact="Alembic revision and persist tests"
  invariant="Chat history is not the system of record."
/>
