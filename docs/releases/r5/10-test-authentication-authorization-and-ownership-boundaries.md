---
id: r5-10
title: "Test authentication, authorization, and ownership boundaries"
release: r5
order: 10
prerequisites: [r5-09]
outcomes:
  - Apply test authentication, authorization, and ownership boundaries to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Test authentication, authorization, and ownership boundaries


This is step 10 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A happy-path login test can be green while customers edit inventory and read each other’s orders. Security tests must press each boundary from the wrong side.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

Organize tests by layers of decision. Authentication cases establish whether a principal exists. Role cases ask whether that principal may invoke an action category. Ownership cases ask whether that principal may act on this specific hold or order. State cases ask whether the resource itself permits the command. Keeping these labels separate makes a `403` failure diagnosable.

Prefer HTTP tests for public status/problem shapes and service tests for a dense policy matrix. Use real token verification where cryptographic or expiry behavior matters; use a controlled token issuer and clock, never production secrets.

## Check it by hand

For `POST /api/inventory/items`: no token → `401`; invalid token → `401`; customer Sita → `403 /forbidden`; staff Anil → `201`. For checkout of Maya’s `H-845`: Sita’s valid customer token is authenticated and has the customer role, but ownership still denies the operation.

## Start with a failing test

Implement the failing acceptance test from `checks/r5`: with valid customer headers, inventory creation for `GP-N-DENIED` returns `403` and problem type `/forbidden`. Preserve the order replay test too: authenticated owned hold, same `Idempotency-Key`, same request, same `order_id`. Add tests for cross-customer reads/writes, expired tokens, staff limits, and absence of secret data in errors.

## Trace the non-trivial flow

Each HTTP test constructs credentials through the test issuer, sends the request, and asserts status plus safe body. It then queries state/audit through trusted test helpers: denied writes created no inventory/order; accepted sensitive writes created one event; replay created no duplicate. Avoid asserting only the status while an unauthorized side effect remains.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Create a matrix with columns principal, role, owner, resource state, expected status, state delta, and audit delta. Fill at least eight cases. Predict which denials intentionally return the same public response to reduce enumeration.

## Worked reasoning

Boundary evidence includes both response and absence/presence of effects. Customer inventory creation is `403 /forbidden` with no row. Exact checkout replay returns the original order with no second payment or creation audit. Those are separate controls and both need tests.

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
