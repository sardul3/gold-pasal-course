---
id: r7-05
title: "Compose API and PostgreSQL for local production simulation"
release: r7
order: 5
prerequisites: [r7-04]
outcomes:
  - Apply compose api and postgresql for local production simulation to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Compose API and PostgreSQL for local production simulation


This is step 5 of 9. Describe the two-service system as committed configuration.

## See the idea first

### `localhost` points at the wrong machine

Inside the API container, `localhost` means the API container itself, not PostgreSQL. Compose gives services a shared network and DNS names, so the database host is the database service name.

**Docker Compose** turns a YAML description into related containers, networks, and volumes. It approximates production wiring locally; it does not reproduce production scale, orchestration, or security.

<FailureWorkbench incident="The API container cannot connect to PostgreSQL although both containers are running." :hypotheses="['DATABASE_URL uses localhost', 'PostgreSQL is not ready', 'the services do not share a network']" next-evidence="Render Compose configuration and resolve the database service name from the API container." />

## Map the stack by hand

```text
browser -> host port -> api:8000
api -> db:5432
db -> named volume at PostgreSQL data directory
```

Only the API needs a host-published port for this exercise. Publishing PostgreSQL exposes it beyond the internal network and should have a stated local need.

## Learner work: render before run

Run the r7 Compose acceptance test before writing the manifest. Then author services for API and PostgreSQL, a named data volume, runtime configuration, health behavior, and explicit startup dependency semantics.

First render without starting:

```bash
docker compose config
```

Inspect the resolved image/build, service names, environment keys, network, volume, and health checks. Do not paste rendered secrets into evidence.

<PredictThenRun prompt="From inside the API container, what hostname and port reach PostgreSQL, and which port reaches the API from the host?">

Start the stack, query `/health` and `/ready`, and inspect service status. A running database process is not automatically a ready database.

</PredictThenRun>

## Walk through service discovery

Compose creates a project network. DNS resolves `db` to the database container’s current address. Replacing the database container may change its address, so application configuration uses the stable service name rather than an IP.

## Practice

Replace only the API container. Predict what happens to the database process, named volume, and catalog data. Verify without deleting volumes.

## Worked answer

The host reaches the published API port. The API reaches `db:5432` on the project network. Replacing the API should not replace the named database volume or erase data. This proves local wiring, not production resilience.

## Check

```bash
docker compose config --quiet
```

This is the exact Compose validity boundary in `checks/r7/test_container.py`. Follow it with `docker compose up --build --wait`.

<EvidenceCard
  command="docker compose config --quiet"
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
