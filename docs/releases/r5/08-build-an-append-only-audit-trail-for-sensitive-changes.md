---
id: r5-08
title: "Build an append-only audit trail for sensitive changes"
release: r5
order: 8
prerequisites: [r5-07]
outcomes:
  - Apply build an append-only audit trail for sensitive changes to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Build an append-only audit trail for sensitive changes


This is step 8 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

When a bangle disappears from available inventory, operations need to know who changed what and when. An editable `last_modified_by` field shows only the latest story and can be rewritten with the record it is meant to explain.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

An audit event is an immutable business record: event ID, UTC time, actor subject and role, action, resource type/ID, outcome, request or correlation ID, and safe change metadata. Append-only means normal application roles can insert and read allowed events but cannot update or delete them. Keep audit separate from debug logs; logs may expire quickly and contain operational noise.

Write the domain change and its audit event in the same database transaction when they must agree. Audit failed authorization separately outside the rejected business transaction if required. Never place password hashes, bearer tokens, or full payment credentials in event payloads.

## Check it by hand

Event `AE-501`: at `04:30Z`, actor `S-ANIL` with role `STAFF` performed `INVENTORY_ITEM_CREATED` on `GP-N-042`, outcome `SUCCESS`, request `req-17`. Later event `AE-502` records Sita’s order creation. Neither event is overwritten when order state changes.

## Start with a failing test

Write failing integration tests that a sensitive write creates exactly one audit event with actor, action, resource, and request ID. Replay an idempotent order request and assert it does not create a second “order created” event. Attempt update/delete through the application database role and assert denial or absence of such repository methods.

## Trace the non-trivial flow

The use case authenticates and authorizes the actor, performs the state change, appends a sanitized event through an audit port/repository, and commits both. The API returns only after commit. A reader orders by immutable timestamp plus event ID. Operational retention and export protect the trail from loss, but append-only application code is not the same as tamper-proof storage.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Design events for inventory creation, order creation, authorization denial, and order cancellation. For each field, decide whether it helps investigation and whether it exposes sensitive data. Predict event count after an exact idempotent replay.

## Worked reasoning

One accepted order command produces one creation event even when its HTTP response is replayed. Append-only preserves history; it does not guarantee an administrator cannot tamper with the database. Permissions, backups, monitoring, and possibly external retention strengthen that claim.

## Check

```bash
uv run pytest tests/http/orders tests/security -q
```

Run the narrow test you wrote first, then this release check. Read the exit status and one meaningful order ID, denial type, or side-effect count. Green output without an explanation is incomplete evidence.

<EvidenceCard
  command="uv run pytest tests/http/orders tests/security -q"
  artifact="authorization tests, an audit sample, and an idempotency demonstration"
  invariant="retries do not duplicate effects and principals cannot cross ownership boundaries"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="authorization tests, an audit sample, and an idempotency demonstration"
  interview-question="How do authentication, authorization, ownership, and audit differ?"
/>
