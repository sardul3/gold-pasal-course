---
id: r7-06
title: "Distinguish startup, liveness, and readiness checks"
release: r7
order: 6
prerequisites: [r7-05]
outcomes:
  - Apply distinguish startup, liveness, and readiness checks to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Distinguish startup, liveness, and readiness checks


This is step 6 of 9. Give each health signal one decision to make.

## See the idea first

### Alive does not mean ready

The API process is running, but PostgreSQL is restarting. Killing the API will not repair PostgreSQL. Sending order traffic will fail. One “health” result cannot safely drive both decisions.

A **startup check** asks whether initialization finished within its allowed time. A **liveness check** asks whether the process should be restarted. A **readiness check** asks whether the instance should receive traffic now.

<FailureWorkbench incident="A database outage causes an endless API restart loop." :hypotheses="['liveness depends on PostgreSQL', 'startup allowance is too short', 'readiness and liveness share one endpoint']" next-evidence="Call /health and /ready while PostgreSQL alone is unavailable." />

## Decide the expected matrix

Write this before implementation:

```text
state                         startup  live  ready
initialization still valid    wait     yes   no
API event loop stuck          fail     no    no
PostgreSQL unavailable        done     yes   no
all dependencies usable       done     yes   yes
```

The exact startup mechanism differs between Compose and later orchestrators, but the meanings must remain distinct. `/health` should be cheap and independent of PostgreSQL. `/ready` may use a bounded dependency check.

## Learner work: failing scenarios first

Write HTTP tests for `/health` and `/ready` with the database available and unavailable. Write a contract assertion that both paths appear separately in OpenAPI. Then run red before changing handlers.

Implement the smallest distinct checks. Use short timeouts and safe response bodies. Configure Compose health around the traffic decision you need, without turning dependency loss into an API restart loop.

<PredictThenRun prompt="When PostgreSQL stops after successful startup, what should /health and /ready return, and what action follows each result?">

Stop only PostgreSQL, observe both endpoints, restore it, and time readiness recovery.

</PredictThenRun>

## Walk through failure

Liveness says the API process can still do work, so PostgreSQL failure leaves it healthy. Readiness says order traffic would fail, so it becomes unready. When PostgreSQL returns, readiness recovers without replacing the API process.

## Practice

Make the readiness database check exceed its timeout. Predict the HTTP result and confirm the endpoint does not hang indefinitely. Keep `/health` responsive.

## Worked answer

During a database outage, liveness remains successful and readiness fails. Traffic should stop, but the API should not restart merely because its dependency is down. Separate OpenAPI paths make that contract visible.

## Check

```bash
docker compose up --build --wait
```

Also run the r6 contract check, which requires both `/health` and `/ready` in OpenAPI. Preserve the outage/recovery transcript.

<EvidenceCard
  command="docker compose up --build --wait"
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
