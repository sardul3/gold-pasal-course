---
id: r4-08
title: "Expire holds safely and make time testable"
release: r4
order: 8
prerequisites: [r4-07]
outcomes:
  - Apply expire holds safely and make time testable to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Expire holds safely and make time testable


This is step 8 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

At 10:15, a fifteen-minute hold should release a necklace even if no background job ran at exactly that second. If code calls the system clock in five places, a boundary test can disagree with itself by milliseconds.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

Put time behind a port: an interface whose `now()` returns a timezone-aware instant. Production uses the system clock; tests use a fixed or manually advanced clock. Java learners can compare this to injecting `java.time.Clock` into a Spring service. Store UTC instants in PostgreSQL and convert to Nepal time only at presentation boundaries.

Define expiry precisely. A useful rule is active when `now < expires_at`; at equality, it is expired. Read paths should treat expired holds as unavailable history even before cleanup. A cleanup worker may mark or release them for efficiency, but correctness must not depend on scheduler punctuality.

## Check it by hand

A hold is created at `2026-09-20T04:15:00Z`, which is `10:00` in Nepal, and expires at `04:30:00Z`. At `04:29:59Z` it is active. At exactly `04:30:00Z` it is expired. A new claim at equality may proceed, subject to the same database serialization used for all claims.

## Start with a failing test

Write failing tests with a fake clock for one second before, exactly at, and one second after expiry. Add an integration test where an expired historical hold exists and a new request for the same item succeeds. Never use `sleep`; sleeping makes tests slow and still leaves timing uncertainty.

## Trace the non-trivial flow

The application captures `now` once per use case, passes it to domain decisions and repository queries, and computes `expires_at` from that value. The claim transaction locks the item, ignores or closes expired holds according to the model, and creates the new hold. The response uses the persisted expiry, not a second clock reading.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Advance a fake clock from `04:29:59Z` by one second. Predict active counts before and after. Repeat across Nepal midnight and verify that UTC comparison does not change.

## Worked reasoning

At equality the sample hold is expired because the rule is `now < expires_at`. One captured, injected instant removes flaky timing. Cleanup remains operational housekeeping; transaction-time eligibility protects correctness.

## Check

```bash
uv run pytest tests/integration/inventory -q
```

Run the narrow test you wrote first, then this release check. Read the exit status and one meaningful identifier or count; green output without an explanation is incomplete evidence.

<EvidenceCard
  command="uv run pytest tests/integration/inventory -q"
  artifact="a migration plus a passing concurrent-reservation integration test"
  invariant="one physical item cannot have two active holds"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a migration plus a passing concurrent-reservation integration test"
  interview-question="Where should transaction boundaries live, and why?"
/>
