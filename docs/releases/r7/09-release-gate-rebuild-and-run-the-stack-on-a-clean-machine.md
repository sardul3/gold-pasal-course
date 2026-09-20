---
id: r7-09
title: "Release gate: rebuild and run the stack on a clean machine"
release: r7
order: 9
prerequisites: [r7-08]
outcomes:
  - Apply release gate: rebuild and run the stack on a clean machine to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Release gate: rebuild and run the stack on a clean machine


This release gate proves the repository contains enough information to rebuild, start, inspect, fail, recover, and explain Gold Pasal without borrowing your laptop state.

## See the idea first

### Define “clean”

A clean machine has Docker and the checked-out repository. It does not have your virtual environment, local PostgreSQL data, exported application variables, uncommitted files, or cached Gold Pasal images.

The gate is a **reproducibility test**: another operator should produce the same behavior from committed inputs and documented runtime configuration. Byte-identical images require additional build controls; do not claim that unless you measure it.

<FailureWorkbench incident="A clean-machine build or startup differs from the developer laptop." :hypotheses="['an input is uncommitted', 'a dependency or base image is not pinned', 'runtime configuration depends on shell state']" next-evidence="Compare checkout, build context, resolved Compose config, image identity, and supplied configuration." />

## Gate 1: static acceptance

Run:

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r7 --app-repo "$PWD"
```

The check builds the image, verifies its configured user is neither empty nor root, rejects image environment entries containing `SECRET=` or `PASSWORD=`, and validates `docker compose config --quiet`.

## Gate 2: clean rebuild and smoke

Use a fresh VM, clean-machine runner, or carefully documented empty Docker context. From the committed checkout:

1. render Compose configuration;
2. build without relying on local application artifacts;
3. start API and PostgreSQL with documented runtime values;
4. wait for healthy/ready state;
5. call `/health`, `/ready`, and one catalog path;
6. record image ID or digest and running user.

<PredictThenRun prompt="Before the clean run, list every allowed external input and the exact health, readiness, identity, and data results you expect.">

If the run needs an undocumented file from your laptop, stop and classify it as a missing committed input, a secret that needs documented injection, or an accidental dependency.

</PredictThenRun>

## Gate 3: failure, persistence, and recovery

Create the test sentinel from lesson 7. Replace the API and confirm the data remains. Stop PostgreSQL and show liveness stays healthy while readiness fails. Restore PostgreSQL and show readiness recovers. Perform the clean-target restore rehearsal.

## Gate 4: supply-chain evidence

Generate the SBOM and vulnerability report for the exact image identity tested above. Record exceptions with owner and review date. Do not rebuild between test and evidence collection.

## Practice

Hand the checkout and runbook to another learner. Observe silently until a documented step is ambiguous or fails. Fix the documentation or committed configuration, not their machine by hand.

## Worked answer

A passing gate shows that committed manifests build a non-root, secret-free image; Compose renders; the API and PostgreSQL become ready; dependency loss changes readiness but not liveness; data survives replacement and can be restored; and SBOM/scan evidence names the tested image. It does not prove production scalability or universal reproducibility.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r7 --app-repo "$PWD" && docker compose up --build --wait
```

Submit the clean-machine transcript, image identity, non-root inspection, health/readiness drill, restore evidence, SBOM, and scan decision.

<EvidenceCard
  command="uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r7 --app-repo &quot;$PWD&quot; &amp;&amp; docker compose up --build --wait"
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
