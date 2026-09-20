---
id: r5-01
title: "Move from hold to order with an explicit state machine"
release: r5
order: 1
prerequisites: []
outcomes:
  - Apply move from hold to order with an explicit state machine to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Move from hold to order with an explicit state machine


This is step 1 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

Sita’s necklace hold is not yet an order. Payment can fail, the hold can expire, or staff can cancel before handover. A single mutable `status` string permits nonsense such as moving a cancelled order back to paid unless you define the allowed moves.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

A state machine names valid states and transitions. Use product language, for example `PENDING_PAYMENT → PAID → FULFILLED`, with `PENDING_PAYMENT → PAYMENT_FAILED` and eligible states → `CANCELLED`. Decide where the held inventory becomes sold and what happens after payment failure. The transition method should reject every arrow that is not drawn.

For a Java/Spring learner, think of a domain aggregate whose methods enforce transitions before a JPA repository persists it. Do not let a controller set `order.status` directly. Persist the current state and enough timestamps or audit events to explain how it changed.

## Check it by hand

Hold `H-731` belongs to `C-SITA`, covers `GP-N-042`, and expires at `10:15`. Checkout at `10:10` creates order `O-9001` in `PENDING_PAYMENT`. A successful payment moves it to `PAID`; handover at the New Road counter moves it to `FULFILLED`. `FULFILLED → PENDING_PAYMENT` is never valid.

## Start with a failing test

Write parameterized failing domain tests for every allowed arrow and representative forbidden arrows. Add a public API test: checkout with an active owned hold creates one order; checkout with an expired or another customer’s hold does not. The learner writes the state type, transition logic, persistence, and endpoint only after those tests fail for the expected reason.

## Trace the non-trivial flow

The authenticated principal selects an owned hold. Inside one application transaction, validate expiry and state, create the order, and record the transition. The payment port is invoked according to the design in the next lessons; failures must not silently mark the order paid. Return an order identifier and explicit state, not an ORM object.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Draw the transition table with rows “current state,” “command,” “next state,” and “inventory effect.” For `PAYMENT_FAILED`, decide whether retry creates a transition on the same order or a new attempt. Predict the result of cancelling a fulfilled order before coding.

## Worked reasoning

The hand-checkable happy path is `PENDING_PAYMENT → PAID → FULFILLED`. A forbidden transition must leave both state and inventory unchanged. The state machine defines order behavior; it does not make retries safe or prove payment-provider behavior.

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
