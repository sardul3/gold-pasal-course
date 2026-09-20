---
id: r5-02
title: "Make order creation idempotent"
release: r5
order: 2
prerequisites: [r5-01]
outcomes:
  - Apply make order creation idempotent to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Make order creation idempotent


This is step 2 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A mobile connection drops after Gold Pasal accepts checkout. Sita taps again. The two HTTP requests express one intention, so they must not create two orders or call payment twice.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

Idempotency means repeating the same command has the same effect as applying it once. The client sends an `Idempotency-Key`, such as `checkout-731`. Store that key with the authenticated owner, a fingerprint of the normalized request, the resulting order ID, and completion state. A database uniqueness rule on `(customer_id, key)` closes concurrent replay races.

The key is not a cache key shared by everyone. The same key from another customer is a different security context. The same customer reusing a key with changed content must receive a conflict; returning the first response would hide a client bug.

## Check it by hand

First request: customer `C-SITA`, key `checkout-731`, hold `H-731`, payment reference `stub-NP-17` → order `O-9001`. Exact replay returns `O-9001` and does not charge again. Reusing `checkout-731` with hold `H-999` is a mismatch, not a second checkout.

## Start with a failing test

Write the public failing test aligned with `checks/r5/test_secure_orders.py`: seed an item, create a hold, post `/api/orders` twice with the same authenticated customer, body, and key. First status is `201`; replay may be `200` or `201`; both bodies contain the same `order_id`. Spy on the payment port and assert one call. Add changed-body and simultaneous-replay tests.

## Trace the non-trivial flow

In one transaction, claim the idempotency record. If a completed matching record exists, return its stored result. If its fingerprint differs, return a conflict. If this request owns a new record, validate the hold, create the order, coordinate payment, store the result, and commit. Do not perform an irreversible external charge and then assume a database commit cannot fail; the payment design needs provider idempotency or reconciliation.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Replay `checkout-731` three ways: exact body, different `payment_reference`, and another customer’s token. Predict order count and payment-call count. Explain why key uniqueness without a request fingerprint is insufficient.

## Worked reasoning

An exact replay returns `O-9001` with one order and one payment attempt. Changed content conflicts. Customer scope prevents one principal from learning another’s result. This is replay safety, not a guarantee of distributed atomicity with a real provider.

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
