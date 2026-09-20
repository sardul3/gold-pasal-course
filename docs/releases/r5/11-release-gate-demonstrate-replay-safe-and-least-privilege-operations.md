---
id: r5-11
title: "Release gate: demonstrate replay-safe and least-privilege operations"
release: r5
order: 11
prerequisites: [r5-10]
outcomes:
  - Apply release gate: demonstrate replay-safe and least-privilege operations to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Release gate: demonstrate replay-safe and least-privilege operations


This is the release gate. Run the complete path, include controlled failures, and explain the remaining risk without reading a script. You write the failing tests first and all production code; the gate supplies observable contracts, not a solved application.

## See the idea first

The final demonstration joins reliability and security. One authenticated customer checks out one owned necklace hold; a network retry does not duplicate it; the same customer cannot perform a staff write; and operators can explain the audit trail without exposing a secret.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

Build an evidence chain across state, identity, policy, and side effects. An active hold becomes one order through legal state transitions. The idempotency record binds customer, key, and request fingerprint. The payment port observes one logical attempt. Authentication supplies identity; role and ownership limit it. Audit records accepted sensitive actions. Threat tests demonstrate controlled failures.

Do not overstate the gate. The payment adapter is a stub, so PCI, settlement, refunds, and provider reconciliation are not proven. A two-request replay test is not a capacity test. Local token fixtures are not a production identity design.

## Check it by hand

Staff Anil creates `GP-B-AB12CD34` / `GP-BANGLE-AB12CD34` and receives `201`. Sita holds it for 900 seconds. She posts `/api/orders` with key `checkout-AB12CD34` and reference `stub-AB12CD34`; replay returns the same `order_id`. Sita then attempts inventory creation and receives `403 /forbidden`.

## Start with a failing test

Run checks aligned to `checks/r5/test_secure_orders.py`. Required public observations: both staff and customer requests use `Authorization`; item and hold creation return `201`; initial order creation returns `201`; replay returns `200` or `201` with the same `order_id`; customer-on-inventory returns `403` and `/forbidden`. Add local assertions for one payment call and one order-created audit event.

## Trace the non-trivial flow

Narrate the complete request: token verification → typed principal → role/ownership policy → active hold and state transition → scoped idempotency claim → payment port → order/audit commit → stored replay response. On replay, the fingerprint matches and the stored result returns before payment. On forbidden inventory creation, execution stops before any database write.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Demonstrate exact replay, changed-body key reuse, expired token, cross-owner hold, and customer staff-write. Predict status, order count, payment-call count, and audit count for each. Inspect logs using a sentinel token and show the sentinel is absent.

## Worked reasoning

The release passes when one owned checkout yields one order, one payment attempt, and one creation audit across exact replay, while a valid customer token receives `403 /forbidden` for staff inventory. State transition and ownership failures leave no side effect. Report the stub-payment and local-identity limits explicitly.

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
