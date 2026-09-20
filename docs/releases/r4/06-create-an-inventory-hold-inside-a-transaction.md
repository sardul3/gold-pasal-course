---
id: r4-06
title: "Create an inventory hold inside a transaction"
release: r4
order: 6
prerequisites: [r4-05]
outcomes:
  - Apply create an inventory hold inside a transaction to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Create an inventory hold inside a transaction


This is step 6 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

Creating a hold changes several facts together: the item is checked, a claim is recorded, and the caller receives an identifier. If any step fails, none of those changes may remain half-finished.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

A transaction is an all-or-nothing boundary. It is similar to a Spring `@Transactional` application-service method, but with SQLAlchemy 2 you can see it as `with session.begin():`. Put the boundary around the use case, not around each repository call. `flush` sends SQL and exposes constraint failures while keeping the transaction open; `commit` makes the whole transaction visible.

A transaction alone does not prevent a race. Under PostgreSQL’s usual `READ COMMITTED` isolation, two transactions may both read “no hold” before either inserts. This lesson first makes one request atomic; the next lesson adds serialization of competing requests.

## Check it by hand

At `10:00 +05:45`, customer `C-SITA` requests `GP-N-042` for 900 seconds. The intended row expires at `10:15 +05:45` (`04:30Z`). If insertion fails, there must be zero new holds. If it succeeds, the response and database refer to the same hold ID.

## Start with a failing test

Write a failing service or API test using a controlled clock. Assert `201`, the requested stock item, and exactly 900 seconds between creation and expiry. Force the repository’s insert to fail and assert no partial row commits. Then test the public conflict shape expected by `checks/r4`: `409` and a problem type ending `/reservation-conflict`.

## Trace the non-trivial flow

The controller authenticates and validates `ttl_seconds`; the application service starts the transaction; the repository loads or claims `GP-N-042`; the clock supplies one instant; the hold is inserted and flushed; commit occurs when the transaction block exits. Translate known unavailability after rollback. Do not catch every database exception and call it a conflict—connection loss and programmer errors need different handling.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Use TTLs `0`, `1`, and `900`. Predict validation and expiry for each before running tests. Then inject a failure after flush and verify a fresh session sees no hold.

## Worked reasoning

For the normal case, one transaction creates one row expiring 900 seconds after the supplied instant. Rollback evidence proves atomicity. It still does not prove that two simultaneous requests cannot both commit.

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
