---
id: r5-05
title: "Authorize catalog, inventory, and order actions by role"
release: r5
order: 5
prerequisites: [r5-04]
outcomes:
  - Apply authorize catalog, inventory, and order actions by role to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Authorize catalog, inventory, and order actions by role


This is step 5 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

“STAFF” is not a shortcut for unrestricted access, and “CUSTOMER” does not mean a customer may read every order. Gold Pasal needs role checks and ownership checks at the use-case boundary.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

Role-based authorization grants action categories; ownership narrows access to a particular resource. A customer may create a hold, create an order from their hold, and read their order. Staff may create serialized inventory and perform defined operational actions. Decide separately whether staff can view customer orders and which staff role can refund or cancel.

Enforce policy in application services, not only hidden UI buttons. Querying by both resource ID and owner ID can avoid loading another customer’s record. Choose whether unauthorized reads return `403` or `404` to limit resource enumeration, and keep the choice consistent.

## Check it by hand

Sita owns `H-731` and `O-9001`; Maya owns `H-845`. Sita may check out `H-731` but not `H-845`. Sita cannot `POST /api/inventory/items`. Staff member Anil may create `GP-N-042` but should not become the owner of Sita’s order.

## Start with a failing test

Write a permission matrix as parameterized failing tests: anonymous, Sita, Maya, and staff across inventory creation, hold checkout, own-order read, and other-order read. Include the exact acceptance check: a customer `POST /api/inventory/items` returns `403` with a problem type ending `/forbidden`.

## Trace the non-trivial flow

Authentication creates the principal. The use case checks required role, then loads the resource with ownership context, then applies domain state rules. Only after all checks pass does it write. Perform checks inside the same transaction as state change where stale ownership/state could matter. Audit both allowed sensitive writes and meaningful denials without storing credentials.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Complete a 4×4 matrix for anonymous, Sita, Maya, and Anil. For each denial, mark authentication, role, ownership, or state as the reason. Predict whether a nonexistent and another-customer order intentionally look the same.

## Worked reasoning

Customer-on-staff-write is `403 /forbidden`; Sita-on-Maya-hold is denied by ownership even though the role is valid. Role and ownership are independent boundaries. A controller annotation alone does not prove resource ownership.

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
