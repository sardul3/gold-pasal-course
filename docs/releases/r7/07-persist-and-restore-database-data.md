---
id: r7-07
title: "Persist and restore database data"
release: r7
order: 7
prerequisites: [r7-06]
outcomes:
  - Apply persist and restore database data to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Persist and restore database data


This is step 7 of 9. Prove that container replacement and data recovery are different operations.

## See the idea first

### A volume is not a backup

Replacing PostgreSQL should not erase order `ord-731`, so the database uses a named volume. But accidental deletion or corrupted data also affects that volume. Recovery needs a separate backup artifact and a tested restore procedure.

**Persistence** keeps live data beyond a container lifetime. A **backup** is a separate recoverable copy. A **restore** reconstructs a database from that copy. A backup command returning zero is not enough; only a successful restore and data check show usability.

<FailureWorkbench incident="The database container is replaced and operators do not know whether orders survived or can be restored." :hypotheses="['the data directory is not mounted', 'the wrong volume is attached', 'the backup is incomplete or incompatible']" next-evidence="Check one sentinel order after replacement, then restore the backup into an empty database." />

## Define a hand-checkable sentinel

Create test-only records with known values:

```text
order id: ord-restore-731
line count: 2
total: NPR 2,500
state: confirmed
```

After restore, check all four values and important constraints, not only row count.

## Learner work: rehearse in disposable data

First verify volume persistence: create the sentinel, replace the PostgreSQL container without deleting volumes, and query it again. Then create a logical backup with the repository’s documented PostgreSQL tools and record database/tool versions.

Restore into a new empty database or disposable project. Do not restore over the source database.

<PredictThenRun prompt="After replacing only the database container, what survives? After deleting its volume, what independent artifact permits recovery?">

Run schema checks, query the sentinel, and exercise one application read through the API.

</PredictThenRun>

## Walk through the restore

The dump leaves the live volume and becomes a separate artifact. The restore creates schema and data in a clean target. Application migrations and backup format must be compatible; record assumptions and failure output.

## Practice

Change the sentinel after backup, then restore the backup elsewhere. Predict which version appears. This demonstrates the backup’s recovery point without risking live data.

## Worked answer

Container replacement should retain the current volume state. A restore should reproduce the state at backup time, not later edits. The evidence is a clean-target query and API read of `ord-restore-731`.

## Check

```bash
docker compose up --build --wait
```

Save the backup command, artifact checksum, version information, restore transcript, and sentinel assertions. Never commit customer data or credentials.

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
