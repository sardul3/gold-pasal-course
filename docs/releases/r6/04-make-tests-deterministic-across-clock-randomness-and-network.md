---
id: r6-04
title: "Make tests deterministic across clock, randomness, and network"
release: r6
order: 4
prerequisites: [r6-03]
outcomes:
  - Apply make tests deterministic across clock, randomness, and network to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Make tests deterministic across clock, randomness, and network


This is step 4 of 11. Make repeated runs describe the same Gold Pasal event.

## See the idea first

### Three invisible inputs

A hold created “now” expires after 15 minutes. Its identifier contains random bytes. Availability validation calls another service. A test written at 11:59:59 may cross noon; a random collision is unlikely but possible; a network sandbox may be down.

Clock, randomness, and network are inputs even when no function parameter shows them. A **deterministic test** gives the same result from the same stated inputs. Determinism makes a failure reproducible instead of merely retryable.

<TestMatrix unit="fixed time and generated IDs make hold rules repeatable" slice="request IDs and safe dependency failures stay observable" integration="recorded or local dependencies test adapters without public internet" />

<FailureWorkbench incident="The hold-expiry test fails only near a minute boundary in CI." :hypotheses="['the test reads the real clock twice', 'expiry uses a different timezone', 'a network retry crosses the boundary']" next-evidence="Capture every clock read and run with one injected instant." />

## Check one case by hand

Given `created_at = 2026-09-20T04:00:00Z` and a 15-minute lifetime:

```text
04:14:59Z -> active
04:15:00Z -> decide and document the boundary
04:15:01Z -> expired
```

Do not freeze time without deciding the equality rule. The expected result at exactly `04:15:00Z` is part of the domain contract.

For random request IDs, use a generator boundary that can return `acceptance-trace-42` in a test. For a network result, use the owned port from lesson 3 and reserve real network behavior for adapter contract tests with explicit timeouts.

## Learner work: expose the inputs

Write the boundary-time test first with one fixed UTC instant. Then write a request test that supplies `X-Request-ID: acceptance-trace-42` and expects the same value in the response header. This directly prepares the release contract.

Run each test repeatedly before production changes. A repeat loop does not fix nondeterminism; it helps reveal it.

<PredictThenRun prompt="At the exact expiry instant, is the hold active or expired, and which comparison operator expresses that decision?">

After implementation, move the clock five minutes forward without sleeping. Confirm that only the expected domain state changes.

</PredictThenRun>

## Walk through the inputs

Trace one request through three supplied values: fixed current time, fixed ID generator result, and prepared payment response. State where production wiring substitutes the real clock, secure random generator, and bounded network adapter.

Avoid a global seed shared by unrelated tests. One test’s random consumption can otherwise change another test’s result.

## Practice

Find one `sleep`, direct `datetime.now`, unseeded generator, or public-network call in the suite. Replace its hidden input with an explicit seam. Predict the exact value before running the check ten times.

## Worked answer

With an expiry rule of `now >= expires_at`, `04:15:00Z` is expired. A fixed clock proves this without waiting. A fixed request ID proves propagation, while a separate test should prove that missing IDs are generated; neither test should depend on a particular random UUID.

## Check

```bash
uv run pytest -q
```

Run the focused deterministic tests repeatedly, then the full suite once. The r6 acceptance check expects the literal incoming request ID to survive `/health`.

<EvidenceCard
  command="uv run pytest -q"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>
