---
title: "R6 — Production confidence"
description: "Observable behavior, layered tests, and evidence-led incident diagnosis."
---

# R6 — Production confidence

**Release promise:** Observable behavior, layered tests, and evidence-led incident diagnosis.

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

## Lessons

1. [Revisit the testing pyramid using the complete order path](01-revisit-the-testing-pyramid-using-the-complete-order-path)
2. [Write focused unit, HTTP-slice, integration, and contract suites](02-write-focused-unit-http-slice-integration-and-contract-suites)
3. [Use test doubles without testing implementation details](03-use-test-doubles-without-testing-implementation-details)
4. [Make tests deterministic across clock, randomness, and network](04-make-tests-deterministic-across-clock-randomness-and-network)
5. [Use coverage to find risk, not chase a percentage](05-use-coverage-to-find-risk-not-chase-a-percentage)
6. [Enforce formatting, linting, typing, and import boundaries](06-enforce-formatting-linting-typing-and-import-boundaries)
7. [Measure and improve a slow catalog query](07-measure-and-improve-a-slow-catalog-query)
8. [Add structured logs, request IDs, metrics, and traces](08-add-structured-logs-request-ids-metrics-and-traces)
9. [Diagnose a failing order from evidence instead of guesses](09-diagnose-a-failing-order-from-evidence-instead-of-guesses)
10. [Define SLOs and actionable alerts for a small service](10-define-slos-and-actionable-alerts-for-a-small-service)
11. [Release gate: run an incident drill and produce a short postmortem](11-release-gate-run-an-incident-drill-and-produce-a-short-postmortem)

## Release evidence

Run `./scripts/verify.sh` and preserve a diagnostic trace, focused regression test, and short postmortem. At the review, defend this
invariant: **tests and telemetry cover different risks and remain deterministic.**

<ArchitectureTrail
  before="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="Layered tests and telemetry narrow the failure without guesswork."
/>
