---
id: r7-02
title: "Build a small multi-stage Python image"
release: r7
order: 2
prerequisites: [r7-01]
outcomes:
  - Apply build a small multi-stage python image to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Build a small multi-stage Python image


This is step 2 of 9. Package only what the API needs to run.

## See the idea first

### Compilers are build tools, not runtime features

Gold Pasal needs a compiler for one Python dependency during installation. Keeping the compiler, test runner, and source caches in the final image increases size and vulnerability surface without helping the API serve a request.

A **multi-stage build** uses one stage to build dependencies and another as the runtime. Files move between stages only when the Dockerfile explicitly copies them.

<FailureWorkbench incident="The API image is large and contains compilers, tests, and package caches." :hypotheses="['the builder is also the runtime', 'the whole repository is copied', 'dependency caches survive into the final stage']" next-evidence="Inspect image history and list runtime files." />

## Read the stages as a supply chain

The builder starts from a pinned Python base, installs locked dependencies, and produces a virtual environment or wheel set. The runtime starts clean, copies that artifact and application code, and declares the real server command.

Hand-check the intended contents:

```text
builder: compiler + lockfile + build cache + runtime dependencies
runtime: Python + runtime dependencies + Gold Pasal app
runtime excludes: compiler, test suite, .git, .env, caches
```

## Learner work: build from a failing gate

Before authoring the Dockerfile, write or run a smoke check that expects `docker build` to succeed and the built image to start the API. Keep dependency versions locked and add a `.dockerignore`.

Author the two stages yourself. Do not copy a generic Dockerfile without matching the project’s package manager, import path, and server command.

<PredictThenRun prompt="Which files must cross from builder to runtime, and which build-only files should be impossible to find there?">

Build with plain progress, inspect image history, and run the health smoke check. Explain every large layer.

</PredictThenRun>

## Walk through cache behavior

Copy dependency metadata before frequently changing source so dependency installation can reuse a build layer. Copying the whole repository first invalidates that layer on every code edit. Cache speed must not loosen reproducibility: the lockfile remains the dependency source.

## Practice

Change one application file and rebuild. Predict which layers are reused. Then change the lockfile and predict which dependency layer rebuilds.

## Worked answer

An application-only edit should reuse base and locked-dependency layers. A lockfile edit must rebuild dependency installation. The runtime image should contain the resulting dependencies but not the builder toolchain.

## Check

```bash
docker build --tag gold-pasal:course-acceptance .
```

The r7 acceptance check uses this same build boundary. Later it will inspect the runtime user and environment, so do not hide secrets or defer security to Compose.

<EvidenceCard
  command="docker build --tag gold-pasal:course-acceptance ."
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
