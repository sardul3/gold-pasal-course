---
id: r6-03
title: "Use test doubles without testing implementation details"
release: r6
order: 3
prerequisites: [r6-02]
outcomes:
  - Apply use test doubles without testing implementation details to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Use test doubles without testing implementation details


This is step 3 of 11. Isolate unstable collaborators while keeping assertions on store behavior.

## See the idea first

### The payment provider is not your unit test

Gold Pasal asks a payment provider to authorize `NPR 2,500`. A unit test must not charge a card, wait for the internet, or depend on the provider’s sandbox. It needs a controlled replacement that returns the result required by the scenario.

A **test double** is an object used in place of a real collaborator. A stub returns a prepared result. A fake has a small working implementation, such as an in-memory payment ledger. A spy records calls for the rare case where the interaction itself is the public obligation.

<TestMatrix unit="approved and declined payment outcomes drive order state" slice="the API returns the promised status without contacting a provider" integration="the real payment adapter obeys its recorded HTTP contract" />

<FailureWorkbench incident="Refactoring one payment helper breaks 18 tests although checkout behavior is unchanged." :hypotheses="['tests patch private functions', 'tests assert call order instead of outcome', 'the payment boundary has no explicit port']" next-evidence="Read assertions and count those about returned order state versus private calls." />

## Start with the boundary

A **port** is the small interface Gold Pasal owns at a dependency boundary. For this incident it might express “authorize this amount” and return an approved, declined, or unavailable result. The provider SDK remains behind an adapter.

Hand-check two scenarios:

```text
authorization approved -> order accepted once
authorization unavailable -> safe 503, no committed order
```

The test double should make these outcomes possible. It should not force the application to call `client.post`, then `response.json`, in a particular private sequence.

## Learner work: prove behavior

Write the unavailable case first. Supply a tiny learner-authored double through the same boundary used by production. Assert the HTTP response and persisted order count. Run it red before adding or changing the port.

If duplicate charges are a product risk, recording one authorization is legitimate evidence. Assert the count and business arguments—amount, currency, idempotency key—not every internal method call.

<PredictThenRun prompt="If the payment adapter changes from httpx to another HTTP client but returns the same port result, which tests should change?">

Run the focused unit and HTTP-slice suites after a harmless internal rename. A behavioral test should remain green.

</PredictThenRun>

## Walk through the double

Trace the prepared result from the double into the order service. For an unavailable result, identify where an order write is prevented and where the safe problem response is created. Do not let the double manufacture the final HTTP response; that would skip the code under test.

## Practice

Replace one broad mock with a stub or fake that implements only the owned port. Predict which implementation-detail assertions can be deleted while keeping the same public confidence.

## Worked answer

Only adapter contract tests should care that the provider is called correctly. Order tests should care that approval creates one order and unavailability creates none. This division permits an HTTP-client refactor without weakening payment behavior.

## Check

```bash
uv run pytest tests/unit tests/http -q
```

Also run the r6 production contract. A replacement that bypasses middleware can accidentally lose the request ID required by that check.

<EvidenceCard
  command="uv run pytest tests/unit tests/http -q"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>
