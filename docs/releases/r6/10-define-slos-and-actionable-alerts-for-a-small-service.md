---
id: r6-10
title: "Define SLOs and actionable alerts for a small service"
release: r6
order: 10
prerequisites: [r6-09]
outcomes:
  - Apply define slos and actionable alerts for a small service to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Define SLOs and actionable alerts for a small service


This is step 10 of 11. Convert shopper expectations into measurable operating decisions.

## See the idea first

### “The API should be reliable” cannot page anyone

Gold Pasal can be technically “up” while 8% of order attempts fail. Operators need a target tied to a user journey, a measurement window, and an alert that asks for a useful action.

A **service-level indicator (SLI)** is the measured behavior, such as successful valid order requests divided by all valid order requests. A **service-level objective (SLO)** is the target over a window, such as 99.5% over 30 days. The **error budget** is the tolerated bad fraction.

<TestMatrix unit="SLI classification includes and excludes the intended outcomes" slice="routes emit stable status and latency signals" integration="metrics preserve outcome semantics across real dependencies" />

<FailureWorkbench incident="An alert pages for one harmless 404 while a sustained 503 burst is missed." :hypotheses="['all non-2xx statuses count as service failure', 'alert uses raw count instead of rate', 'the evaluation window is too short']" next-evidence="Inspect the SLI query numerator, denominator, route, and window." />

## Calculate one budget by hand

In a window with 10,000 valid order attempts and a 99.5% availability objective:

```text
allowed bad fraction = 100% - 99.5% = 0.5%
error budget = 10,000 × 0.005 = 50 failed attempts
```

If 40 have failed, 10 remain. A shopper’s malformed request should normally be excluded from service failure; a valid order returning `503` should count. Document the classification.

For latency, choose a percentile: “95% of successful valid order requests complete within 500 ms.” An average can hide a slow minority.

## Learner work: write the objective before the alert

Define one availability SLO and one latency SLO for a specific Gold Pasal route. Include population, good event, window, target, exclusions, and data source.

Then author tests for the event classifier: successful order, validation rejection, missing catalog item, dependency 503, and canceled request. Only after those are red should you implement or alter metric classification.

<PredictThenRun prompt="Out of 2,000 valid attempts, 20 return 503. What is availability, and does it meet a 99.5% objective?">

Design an alert on budget burn rather than a single error. Its message must name the affected journey, current signal, likely dashboard or trace entry point, and owner action.

</PredictThenRun>

## Walk through the alert

An actionable page means a person can decide what to do. A fast-burn alert catches a severe short event; a slow-burn alert catches persistent degradation. Both should link from aggregate metric to request-level evidence without placing request IDs in metric labels.

## Practice

Classify ten sample responses by hand, calculate availability, then compare your result with the SLI query. Change one 404 to a 503 and predict the new numerator and budget consumption.

## Worked answer

Twenty failures out of 2,000 valid attempts leaves 1,980 good attempts: `1,980 / 2,000 = 99%`. That misses 99.5%. The 0.5% budget allows ten failures, so this sample consumed twice the budget.

## Check

```bash
./scripts/verify.sh
```

Preserve the SLO definition, classifier tests, one hand calculation, and one sample alert. A green test suite does not prove the objective is being met in operation; production metrics do.

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>
