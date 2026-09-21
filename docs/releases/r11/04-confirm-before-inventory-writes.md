---
id: r11-04
title: "Confirm before inventory writes"
release: r11
order: 4
prerequisites: [r11-03]
outcomes:
  - Split preview from commit
  - Require a confirmation token or staff POST
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="The agent POSTed a hold while the staff member was looking away."
  destination="propose_hold enters awaiting_approval. POST happens only after an explicit confirm API."
/>

# Confirm before inventory writes

Irreversible or inventory-changing actions need a **harness state** `awaiting_approval`, not a hope that the model asks. `propose_hold` returns a preview. `POST /api/agent/runs/{id}/confirm` with the staff token performs the real `POST /api/holds` with an idempotency key.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/http/test_holds.py -q | tail -1
```

```text
... passed
```

Holds already exist. The agent must reuse them, not invent a second hold table.

## State

Run record: `status=running|awaiting_approval|succeeded|rejected|failed`. When the model chooses propose_hold, you create the preview, set awaiting_approval, and return to the staff UI (or curl).

Tests: a run that would hold GP-N-042 does not call POST /api/holds until confirm. Confirm uses the same idempotency key if retried.

The model cannot send `confirm=true` inside a tool argument as a bypass. Confirmation is a separate authenticated route.

## Idempotency on confirm

The confirm route generates or reuses an Idempotency-Key for `POST /api/holds`. Two clicks on confirm must not create two holds. R5 already specified that header. The agent is another client.

The preview payload should include sku, expiry, and the staff principal. It is not a hold row yet.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| hold created in the same step as propose | no state machine | Split |
| confirm without auth | missing bearer | Staff role from R5 |

## Practice

<LessonQuiz
  question="Where does confirmation live?"
  a="In the system prompt"
  b="In harness state and a staff-authenticated confirm route"
  c="In Ollama"
  d="In the catalog description"
  correct="b"
>

Approvals are application state.

</LessonQuiz>

Next: [Persist run state](05-persist-run-state).

<EvidenceCard
  command="uv run pytest tests/agent/test_confirm.py -q"
  artifact="awaiting_approval and confirm route"
  invariant="No inventory write without an authenticated confirm."
/>
