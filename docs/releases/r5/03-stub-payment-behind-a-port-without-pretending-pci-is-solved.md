---
id: r5-03
title: "Stub payment behind a port without pretending PCI is solved"
release: r5
order: 3
prerequisites: [r5-02]
outcomes:
  - Apply stub payment behind a port without pretending pci is solved to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Stub payment behind a port without pretending PCI is solved


This is step 3 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

The course needs to exercise checkout without collecting real card data or pretending a successful string means payment security is complete.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

A payment port is an application-owned interface describing only what checkout needs: authorize or charge an amount using an opaque payment reference and an idempotency key, then return a typed result. An adapter implements that port. The course adapter is deterministic and fake; a future provider adapter would handle HTTP, signatures, timeouts, and provider-specific errors.

This is the same dependency-inversion move a Spring service makes with an interface and injected bean. Keep provider classes outside the domain. Never accept PAN, CVV, or raw wallet credentials in this teaching API. PCI scope, webhooks, settlement, refunds, and disputes remain unsolved.

## Check it by hand

For order `O-9001`, amount `NPR 185000`, reference `stub-NP-17`, and key `checkout-731`, the stub returns an approved result `PAY-STUB-17`. A configured reference such as `stub-decline` returns a decline. The same key and request must return the same provider result rather than incrementing a charge counter.

## Start with a failing test

Write contract tests that every payment adapter must pass: approved, declined, timeout/unknown outcome, and exact replay. Then write an order-service test proving decline does not produce `PAID`. Keep the stub behavior explicit; a stub that always succeeds cannot teach failure handling.

## Trace the non-trivial flow

Checkout constructs a payment command from trusted order data, not client-supplied price. The port receives amount, currency, opaque reference, and idempotency key. The result drives a legal state transition. A timeout is not automatically a decline: the provider may have charged while the response was lost, so mark the outcome pending/unknown and reconcile before retrying blindly.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

For approved, declined, and timeout results, write expected order state and whether inventory remains reserved. Predict the second call with the same key. Then ensure logs contain the provider result ID but not payment credentials.

## Worked reasoning

The port protects application code from provider details and gives tests deterministic outcomes. It does not reduce real PCI obligations by itself. The critical distinction is decline versus unknown outcome; only a confirmed result should drive the corresponding state.

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
