---
id: r7-04
title: "Configure the app through environment variables"
release: r7
order: 4
prerequisites: [r7-03]
outcomes:
  - Apply configure the app through environment variables to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Configure the app through environment variables


This is step 4 of 9. Keep one image portable across environments without baking credentials into it.

## See the idea first

### Same image, different database

The image digest tested in CI should be the digest promoted later. Rebuilding it with a different database URL creates a different artifact. Runtime configuration lets the same image connect to a local Compose database or another approved environment.

An **environment variable** is a name-value pair supplied to a process at startup. Configuration includes ports, log level, and database location. A secret is sensitive configuration and must be supplied through an approved runtime mechanism, never a Dockerfile `ENV`, build argument, committed `.env`, or image layer.

<FailureWorkbench incident="The image starts locally but exposes a development password in image metadata." :hypotheses="['the Dockerfile sets a password', 'a .env file was copied', 'configuration defaults silently to development credentials']" next-evidence="Inspect image Env, history, and filesystem before testing runtime injection." />

## Define the configuration contract

Write down each setting with type, required/default rule, and whether it is sensitive:

```text
APP_PORT: integer, default 8000, not secret
LOG_LEVEL: enum, default INFO, not secret
DATABASE_URL: URL, required at startup, contains sensitive credentials
```

Fail fast with a clear field name when required configuration is absent or malformed. Do not print the full database URL in an error or startup log.

## Learner work: tests before settings

Author tests for valid parsing, missing `DATABASE_URL`, invalid port, redacted diagnostics, and explicit environment precedence. Then run the image acceptance test red and inspect why it fails.

Implement a typed settings boundary in the application and inject runtime values from Compose. Add `.env` to ignore lists; provide only a non-secret example file if learners need field names.

<PredictThenRun prompt="If DATABASE_URL is absent, should the process start unready or fail startup? State the contract and expected evidence.">

Build the image, inspect its `Config.Env`, and search image history. Runtime injection working does not erase a secret already baked into a layer.

</PredictThenRun>

## Walk through precedence

Trace one setting from Compose to process environment to typed settings to database adapter. State which source wins if a default and environment value both exist. Keep configuration parsing at startup so requests do not discover invalid configuration one at a time.

## Practice

Start two containers from the same image with different non-secret log levels. Predict the changed behavior and confirm both image IDs are identical.

## Worked answer

Both containers should use the same image digest while process configuration differs. Missing required database configuration should fail in the documented startup phase with a redacted message. The image metadata must contain no secret or password assignment.

## Check

```bash
docker image inspect gold-pasal:course-acceptance
```

Inspect `Config.Env` and history. Then run `uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r7 --app-repo "$PWD"`, which programmatically enforces the non-root and no-baked-secret expectations.

<EvidenceCard
  command="docker image inspect gold-pasal:course-acceptance"
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
