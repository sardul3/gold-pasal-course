---
id: r4-09
title: "Test real PostgreSQL behavior with Testcontainers"
release: r4
order: 9
prerequisites: [r4-08]
outcomes:
  - Apply test real postgresql behavior with testcontainers to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Test real PostgreSQL behavior with Testcontainers


This is step 9 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A mocked repository can confirm that code asked for a lock. It cannot confirm that PostgreSQL blocks the second transaction, raises the expected conflict, or enforces your index. That evidence needs a real server.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

Testcontainers starts an isolated PostgreSQL container for tests and supplies a dynamic connection URL. It is analogous to using Testcontainers PostgreSQL in a Spring Boot integration test instead of H2. Pin the PostgreSQL major version to production, run Alembic migrations against the container, and seed only the data each test needs.

Choose lifecycle deliberately. One container per test is isolated but slow. One per session with transaction cleanup is faster, but concurrent tests need committed setup and separate connections. Never share one SQLAlchemy `Session` between worker threads.

## Check it by hand

The fixture starts PostgreSQL 16, upgrades to Alembic head, inserts `GP-N-042`, and then opens two independent clients. If both workers use one connection, the test is not a real race. If setup is uncommitted, neither worker may see the item.

## Start with a failing test

Write the failing integration test around the HTTP or application boundary and real PostgreSQL. Assert the exact acceptance observations from `checks/r4`: item creation is `201`; two hold responses sort to `[201, 409]`; the loser exposes `/reservation-conflict`. Afterward query with a fresh session and assert one active hold. Keep fast domain tests too; the container test covers a different risk.

## Trace the non-trivial flow

Test startup waits for PostgreSQL readiness, builds the engine from the container URL, runs migrations, and starts the app with that engine. Workers send simultaneous requests. Teardown disposes the engine before stopping the container. If Docker is unavailable, report a clear prerequisite failure rather than silently substituting SQLite.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Temporarily remove the locking mechanism and confirm the concurrency test fails for the intended reason. Restore it and rerun. Then change the PostgreSQL image major version and explain why an unreviewed image update is a dependency change.

## Worked reasoning

The container proves behavior of migrations, SQL, constraints, and locking on PostgreSQL. It does not prove production capacity or eliminate the need for smaller tests. Exact HTTP statuses connect database behavior to the public contract.

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
