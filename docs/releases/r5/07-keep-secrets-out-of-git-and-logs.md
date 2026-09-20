---
id: r5-07
title: "Keep secrets out of Git and logs"
release: r5
order: 7
prerequisites: [r5-06]
outcomes:
  - Apply keep secrets out of git and logs to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Keep secrets out of Git and logs


This is step 7 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A database URL or token committed for ten seconds may already exist in clones, CI artifacts, and host logs. Deleting the line does not revoke the credential.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

A secret is data that grants access: database passwords, token-signing keys, payment credentials, and production API tokens. Source code should name configuration keys, not contain values. Local development may load an ignored `.env`; deployed environments should inject secrets from their platform’s secret store with least-privilege access.

Logging needs an allowlist mindset. Record request ID, principal ID, action, result, and safe resource IDs. Redact `Authorization`, cookies, passwords, payment references when sensitive, and connection URLs. Do not serialize entire request objects on errors.

## Check it by hand

Safe log: `request_id=req-17 subject=C-SITA action=create_order order=O-9001 result=created`. Unsafe log: `Authorization: Bearer gp_live_example_731` or a PostgreSQL URL containing a password. A sample `.env.example` contains names such as `DATABASE_URL=` with blank or fake values only.

## Start with a failing test

Write a failing log-capture test that submits sentinel secret `DO_NOT_LOG_731` in an authorization header and asserts it is absent from normal and error logs. Add configuration-startup tests for missing required secrets. Run the repository’s secret scanner if present, but do not create realistic-looking live keys for the test.

## Trace the non-trivial flow

At startup, configuration reads environment or secret-provider values, validates presence and format, and fails closed. Requests pass through redaction before structured logging. On suspected exposure, rotate/revoke first, then remove from current files and history according to incident procedure, then investigate access. Git cleanup without rotation is incomplete.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

List each R5 credential, its owner, storage location, rotation method, and allowed readers. Trigger a controlled error containing the sentinel and inspect logs. Predict which metadata remains useful after redaction.

## Worked reasoning

Secrets enter through controlled configuration and never become source or log fields. The incident response order is revoke/rotate, contain, clean, and investigate. `.gitignore` prevents common accidents but cannot protect a value already committed.

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
