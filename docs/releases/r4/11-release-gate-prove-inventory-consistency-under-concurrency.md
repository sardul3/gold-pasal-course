---
id: r4-11
title: "Release gate: prove inventory consistency under concurrency"
release: r4
order: 11
prerequisites: [r4-10]
outcomes:
  - Apply release gate: prove inventory consistency under concurrency to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Release gate: prove inventory consistency under concurrency


This is the release gate. Run the complete path, include the controlled failure, and explain the trade-off without reading a script. You write the failing tests first and all production code; the gate supplies observable contracts, not a solved application.

## See the idea first

The release gate is a connected demonstration, not eleven isolated green checks. You must show that real PostgreSQL stores believable jewelry, two callers contend for one serialized piece, and the system preserves exactly one promise.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

Assemble the proof chain. Migrations create the schema. Deterministic seed/setup creates one stock item. Separate transactions race. PostgreSQL serializes the decision. The API returns one success and one stable conflict. An injected clock explains expiry. Recovery evidence shows operators can protect the resulting records.

A release claim should say what was tested and what was not. This gate checks correctness under one controlled two-request race; it is not a load test, a high-availability test, or proof that every production failure mode is handled.

## Check it by hand

Use a fresh identifier such as `GP-N-AB12CD34`. Staff `POST /api/inventory/items` with SKU `GP-NECKLACE-AB12CD34` and receives `201`. Two authenticated customers each post a 900-second hold. Sort only after collecting both responses: expected statuses are `201` and `409`. Querying afterward finds one active hold.

## Start with a failing test

Run the release check aligned to `checks/r4/test_inventory_concurrency.py`. Before production changes, preserve a red test for any missing behavior. The learner writes all application code: inventory endpoint, transactional claim, PostgreSQL mapping, conflict translation, and test fixtures. This lesson gives observable contracts, not a reference solution.

## Trace the non-trivial flow

Narrate the request boundaries: authentication supplies a customer identity; validation accepts the item and TTL; two independent sessions reach PostgreSQL; one transaction commits; the other rolls back; the problem response ends `/reservation-conflict`. Then show the database row and explain why the guarantee comes from locking or a constraint, not thread timing.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Demonstrate three controlled failures: unknown stock item, invalid TTL, and concurrent contention. Predict each status and problem type first. Repeat the contention check with a fresh identifier so old state cannot create a false pass.

## Worked reasoning

Release evidence is: migrated real PostgreSQL, item creation `201`, race statuses `[201, 409]`, conflict type `/reservation-conflict`, and one committed active hold. Include the restore rehearsal and explain the clock boundary. Do not claim throughput, multi-region safety, or payment correctness from this gate.

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
