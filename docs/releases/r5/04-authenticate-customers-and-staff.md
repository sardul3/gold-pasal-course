---
id: r5-04
title: "Authenticate customers and staff"
release: r5
order: 4
prerequisites: [r5-03]
outcomes:
  - Apply authenticate customers and staff to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Authenticate customers and staff


This is step 4 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

An `Authorization` header answers “who is calling?” It does not answer “may this person add a gold necklace to inventory?” Confusing those questions turns every logged-in customer into staff.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

Authentication verifies a credential and creates a principal: stable subject ID, role claims, and token metadata. Authorization checks that principal against an action and resource. A missing, malformed, expired, or invalid token is an authentication failure (`401`). A valid customer token attempting a staff-only write is authenticated but forbidden (`403`).

Use a framework filter/dependency to parse `Bearer` credentials and attach a principal. Application services should receive the principal explicitly. Do not trust `customer_id` supplied in the request body when the authenticated subject already provides identity.

## Check it by hand

Token A verifies to `{subject: C-SITA, role: CUSTOMER}`. Token B verifies to `{subject: S-ANIL, role: STAFF}`. Both are authenticated. Only B may create `GP-N-042`; A may create a hold for herself. A fake body claiming `customer_id=S-ANIL` does not change A’s identity.

## Start with a failing test

Write failing HTTP tests for no header, malformed scheme, invalid token, expired token, valid customer, and valid staff. Assert `401` for failed authentication without leaking whether an account exists. Then preserve the `checks/r5` contract that valid customer headers exist and can create customer operations.

## Trace the non-trivial flow

The request enters authentication middleware, which validates token integrity, expiry, issuer/audience if used, and extracts the subject. It stores a typed principal in request context. The controller passes that principal to the use case. Authorization runs after authentication and before repository writes. Logging records subject and request ID, never the raw bearer token.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Classify four requests: no token, expired staff token, valid customer token on inventory creation, and valid staff token on inventory creation. Predict `401`, `401`, `403`, and success respectively, then write tests.

## Worked reasoning

Authentication establishes `C-SITA` or `S-ANIL`; authorization decides each action. Valid credentials are not universal permission. The public distinction between `401` and `403` is part of the contract and should be tested without exposing sensitive detail.

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
