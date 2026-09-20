---
id: r5-09
title: "Threat-model Gold Pasal with concrete abuse cases"
release: r5
order: 9
prerequisites: [r5-08]
outcomes:
  - Apply threat-model gold pasal with concrete abuse cases to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Threat-model Gold Pasal with concrete abuse cases


This is step 9 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

“Add security” is not a testable task. “Maya changes Sita’s `hold_id` and buys her necklace” names an actor, an asset, a boundary, and an observable defense.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

Threat modeling is a structured way to ask what you protect, who may attack it, where trust changes, and how you will reduce risk. Draw the customer device, HTTP API, authentication verifier, PostgreSQL, payment adapter, staff workstation, and audit store. Data crossing each boundary is untrusted until validated.

For each abuse case, record precondition, attack path, impact, prevention, detection, and a test. Prioritize by likelihood and impact. STRIDE can prompt categories, but concrete Gold Pasal stories are more useful than checking acronym boxes.

## Check it by hand

Abuse case A: a customer token calls staff inventory creation; prevent with role policy, detect with denial audit, test `403 /forbidden`. B: checkout response is retried; prevent duplicates with scoped idempotency, test same order ID and one payment call. C: change `hold_id` to Maya’s; prevent with ownership query. D: leaked bearer token in logs; prevent redaction and test a sentinel.

## Start with a failing test

Turn the highest risks into failing tests before changing controls: role escalation, cross-customer ownership, idempotency replay, changed-payload key reuse, expired token, secret redaction, and audit immutability. Name tests as given/when/then stories so the protected asset is visible.

## Trace the non-trivial flow

Follow one checkout data-flow: untrusted header and JSON enter; authentication produces a principal; authorization and ownership check the hold; trusted catalog/order data determines amount; the payment port receives an opaque reference; PostgreSQL commits state and audit. Mark every place attacker-controlled data could alter identity, price, resource selection, or logs.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Add an insider case: a valid staff account repeatedly cancels high-value orders. Role checks allow the action, so propose least privilege, approval thresholds, and audit alerts. Rank it beside credential theft and replay using explicit reasons.

## Worked reasoning

A useful threat model ends in owned controls and executable tests. It also admits residual risk: the payment stub proves no provider security, append-only application logic is not tamper-proof, and stolen valid tokens remain dangerous until expiry or revocation.

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
