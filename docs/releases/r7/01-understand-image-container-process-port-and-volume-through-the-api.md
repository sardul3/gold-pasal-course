---
id: r7-01
title: "Understand image, container, process, port, and volume through the API"
release: r7
order: 1
prerequisites: []
outcomes:
  - Apply understand image, container, process, port, and volume through the api to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Understand image, container, process, port, and volume through the API


This is step 1 of 9. Build a precise mental model before writing a Dockerfile.

## See the idea first

### It worked in the developer shell

Gold Pasal starts only because the laptop already has Python packages, a local PostgreSQL process, and an exported database URL. A release artifact must state those requirements instead of borrowing them from one machine.

An **image** is a read-only filesystem and startup configuration. A **container** is one running instance of an image. The container’s main **process** is the API server; when that process exits, the container stops. A **port** is a numbered network endpoint. A **volume** stores data outside the container’s replaceable writable layer.

<FailureWorkbench incident="The API works on one laptop but a new machine cannot start it." :hypotheses="['dependencies are absent from the image', 'host and container ports are confused', 'database data or configuration lives only on the laptop']" next-evidence="List the image files, process command, port mapping, environment, and volume separately." />

## Follow one request

For `curl http://localhost:8000/health`:

```text
host port 8000 -> container port 8000 -> API process -> /health
```

Port publication does not copy files or persist data. The image supplies application files. A named volume mounted at PostgreSQL’s data directory preserves database files when its container is replaced.

## Learner work: prediction before commands

Draw the five objects for Gold Pasal: API image, API container, API process, published port, and PostgreSQL volume. Then inspect an existing container or a tiny disposable image and identify each object from command output.

Write a failing container-level smoke check that expects `/health` to respond after startup. Do not implement the image yet. Confirm the failure says the image or service is absent, not that your assertion is malformed.

<PredictThenRun prompt="If you delete only the API container, which of image, process, port mapping, and PostgreSQL volume remain?">

Run the removal and inspection commands in a disposable project. Compare each surviving object with your prediction.

</PredictThenRun>

## Walk through replacement

Stopping a container stops its process. Removing it removes that container’s writable layer and port mapping. The image remains until removed. A separately named volume remains until explicitly deleted. This replaceability is why application state does not belong inside the API container.

## Practice

Create a text file in a disposable container layer and another on a mounted volume. Replace the container. Predict which file survives, then verify. Do not use Gold Pasal customer data for this exercise.

## Worked answer

After API-container deletion, its process and port mapping are gone. The image and named database volume remain. A new container can be created from the same image and reattached to the volume through committed configuration.

## Check

```bash
docker version && docker compose version
```

Record the diagram and smoke-test failure. Later lessons will make it pass; this lesson establishes what each Docker object is responsible for.

<EvidenceCard
  command="docker version && docker compose version"
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
