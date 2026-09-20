---
id: r4-07
title: "Reproduce and fix the double-reservation race"
release: r4
order: 7
prerequisites: [r4-06]
outcomes:
  - Apply reproduce and fix the double-reservation race to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Reproduce and fix the double-reservation race


This is step 7 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

The dangerous sequence is short: Sita reads “available,” Maya reads “available,” Sita inserts, Maya inserts. Every line is reasonable alone, yet the shop has promised one necklace twice.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

This is a time-of-check/time-of-use race. Python locks or Java `synchronized` only coordinate threads in one process; production may run several pods. Put serialization where all instances meet: PostgreSQL. One option is to lock the stock-item row with `SELECT ... FOR UPDATE`, then inspect active holds and insert while holding that lock. Another is a database constraint or exclusion strategy that makes the invalid second commit impossible. Document the chosen rule and its behavior around expiry.

The loser is expected business contention, not an internal server error. Roll it back and return the stable conflict contract.

## Check it by hand

Transaction A and B both target `GP-N-042`. With a row lock, A obtains the lock; B waits. A inserts `H-SITA` and commits. B wakes, rereads under its transaction, sees `H-SITA`, rolls back, and receives `409`. The final active-hold count is exactly one.

## Start with a failing test

First write a deterministic failing concurrency test, not a loop that hopes to collide. Use two workers, a barrier so both requests begin together, and separate sessions/connections. The public acceptance contract mirrors `checks/r4/test_inventory_concurrency.py`: staff creates one item through `POST /api/inventory/items`; two customer calls post the same item and TTL; sorted statuses are `[201, 409]`; the conflict type ends `/reservation-conflict`.

## Trace the non-trivial flow

Each request owns its transaction. The winning request locks, inserts, and commits before returning `201`. The losing request must not reuse the winner’s session or accidentally commit after catching an integrity error. PostgreSQL errors leave a transaction aborted until rollback. Translate only after rollback, then verify a fresh query sees one active hold.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Run the race 25 times with a new item each time. Record status pairs and final active counts. Then explain why “it passed 25 times” is supporting evidence, while the lock or constraint is the actual guarantee.

## Worked reasoning

The required observation is `[201, 409]`, one active row, and `/reservation-conflict`. A barrier makes the test likely to exercise overlap; the database serialization mechanism makes correctness independent of lucky scheduling.

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
