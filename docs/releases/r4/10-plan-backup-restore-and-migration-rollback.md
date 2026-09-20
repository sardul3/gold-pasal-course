---
id: r4-10
title: "Plan backup, restore, and migration rollback"
release: r4
order: 10
prerequisites: [r4-09]
outcomes:
  - Apply plan backup, restore, and migration rollback to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Plan backup, restore, and migration rollback


This is step 10 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A backup command that once printed “success” is not yet a recovery plan. Gold Pasal needs to know whether `GP-N-042`, its hold history, and current schema can be restored within an acceptable outage.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

Define recovery point objective (maximum acceptable data loss) and recovery time objective (maximum acceptable downtime). For example, a 15-minute RPO means losing two hours of orders is unacceptable. PostgreSQL logical dumps are portable but slower at scale; physical backups plus write-ahead-log archiving support point-in-time recovery. Pick based on measured needs, not vocabulary.

Application rollback and schema rollback differ. With additive migrations, you can often deploy the previous application while leaving new columns in place. A destructive Alembic downgrade may erase data and should not be the automatic response to bad code.

## Check it by hand

Before backup, record counts and identifiers: products 2, stock items 3, active holds 1, including `GP-N-042` and `H-731`. Restore into a separate empty database, run integrity queries, and compare those values. Restoring over the source destroys your evidence and risks the only copy.

## Start with a failing test

Write a recovery rehearsal script or documented test that creates known data, takes a backup, destroys only the disposable target, restores into a new database, and runs migrations/verification. Add a migration rollback rehearsal for the latest revision. The learner supplies commands appropriate to the repository and records durations and checksums; do not paste real credentials into evidence.

## Trace the non-trivial flow

During a failed release: stop further risky writes if necessary, identify whether code or data is wrong, choose application rollback versus restore, communicate the recovery point, restore to a new instance, verify schema revision and named records, then switch traffic. Preserve the failed database for investigation.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Assume backups run hourly and failure is discovered 50 minutes after the last backup. Calculate worst-case data loss without WAL archiving. Then state which evidence would let you choose a point-in-time restore.

## Worked reasoning

Hourly snapshots alone imply up to 60 minutes of loss, regardless of a fast restore. A credible plan contains measured restore time, named data checks, schema compatibility, and a safe traffic-switch decision. A generated dump file alone is not evidence of recoverability.

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
