---
id: r7-03
title: "Run as non-root with a read-only-friendly filesystem"
release: r7
order: 3
prerequisites: [r7-02]
outcomes:
  - Apply run as non-root with a read-only-friendly filesystem to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Run as non-root with a read-only-friendly filesystem


This is step 3 of 9. Reduce what a compromised API process can change.

## See the idea first

### The process has more power than it needs

The API only needs to read its code, open a network connection, and write temporary files in a designated location. Running as root lets a defect or exploit modify far more of the container filesystem.

A **non-root user** has a numeric user ID other than 0. A **read-only root filesystem** prevents runtime writes to image-backed paths. “Read-only-friendly” means required writes are explicit: a temporary filesystem or mounted data location, not accidental writes beside source code.

<FailureWorkbench incident="Gold Pasal starts as root and crashes when the root filesystem becomes read-only." :hypotheses="['the image never sets USER', 'bytecode or cache writes target the source tree', 'temporary files have no writable mount']" next-evidence="Inspect image user and run with read-only root plus an explicit temporary filesystem." />

## Hand-check permissions

For user ID `10001`:

```text
/app            read, execute
/app/source.py  read
/tmp            write through explicit tmpfs
/               no general write
```

Changing every path to mode `777` defeats the boundary. Give ownership only where required, then switch users in the final image stage.

## Learner work: security checks first

Run the acceptance test before changing the Dockerfile. It inspects `Config.User` and must reject empty, `0`, or `root`. Add your own runtime checks for numeric identity, successful `/health`, inability to write under `/app`, and ability to use only the intended temporary location.

Then create the user, set precise ownership, declare `USER`, and configure runtime writes. Test with `--read-only` and a temporary filesystem.

<PredictThenRun prompt="Which write attempt should fail under /app, which should succeed under the explicit temporary path, and why?">

Inspect the running identity rather than trusting the Dockerfile text.

</PredictThenRun>

## Walk through startup

The final image metadata selects the non-root user before the server starts. Python imports readable code, the server binds an unprivileged port, and temporary writes go only to the declared location. A startup failure under read-only mode is evidence of an undocumented write.

## Practice

Run once with the writable temporary mount removed. Predict the exact operation that fails. Restore the mount and confirm that no broader path became writable.

## Worked answer

The image inspection must show a non-root user. The runtime should serve health under a read-only root, reject writes to `/app`, and permit only declared temporary writes. This limits damage; it does not make vulnerable code safe.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r7 --app-repo "$PWD"
```

The course check also rejects environment entries containing `SECRET=` or `PASSWORD=` in image metadata.

<EvidenceCard
  command="uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r7 --app-repo &quot;$PWD&quot;"
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
