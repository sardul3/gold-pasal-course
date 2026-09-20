---
id: r8-05
title: "Configure probes, requests, limits, and graceful shutdown"
release: r8
order: 5
prerequisites: [r8-04]
outcomes:
  - Apply configure probes, requests, limits, and graceful shutdown to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Configure probes, requests, limits, and graceful shutdown


Kubernetes needs separate answers to three questions: has the FastAPI lifespan startup finished, can the app receive traffic now, and is its process alive? One probe reused three times cannot express those different failure boundaries.

## See the idea first

```yaml
startupProbe:
  httpGet: { path: /health, port: http }
readinessProbe:
  httpGet: { path: /ready, port: http }
livenessProbe:
  httpGet: { path: /health, port: http }
```

Tune the startup failure window for dependency setup performed by FastAPI's lifespan handler. `/ready` may report unavailable when PostgreSQL cannot safely serve requests. `/health` only proves the Uvicorn worker can answer; a database outage must not trigger a restart storm. The startup and liveness probes may call the same lightweight path, but their thresholds and purposes remain distinct; the course check requires the probe definitions themselves to differ from readiness.

## Budget resources and termination

```yaml
resources:
  requests: { cpu: <measured-floor>, memory: <measured-floor> }
  limits: { memory: <measured-ceiling> }
terminationGracePeriodSeconds: <greater-than-app-shutdown-time>
```

Requests are scheduler reservations. Limits constrain consumption; exceeding memory causes `OOMKilled`. Base values on measured Python startup and request load, not copied numbers. Run Uvicorn as PID 1 in exec form so it receives SIGTERM. Use FastAPI lifespan cleanup to close the SQLAlchemy pool and other resources, and set Uvicorn's graceful-shutdown timeout below `terminationGracePeriodSeconds` so in-flight requests can finish before Kubernetes sends SIGKILL.

<FailureWorkbench incident="A rollout repeatedly restarts slow-starting pods." :hypotheses="['startup window is too short', 'memory limit is below Python peak', 'liveness checks a dependency']" next-evidence="Inspect pod lastState, restart count, events, and previous container logs." />

## Practice

Make readiness fail safely while liveness remains healthy. Confirm the pod disappears from EndpointSlices without its restart count increasing. Restore readiness, then send SIGTERM during a slow test request and verify it completes inside the grace period.

<PredictThenRun prompt="When readiness fails but liveness passes, what changes in endpoints, pod phase, and restart count?">

</PredictThenRun>

## Public evidence

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r8 --app-repo "$PWD" -k operational_safety
kubectl describe pod -l app=gold-pasal-api
```

The check requires distinct readiness and liveness definitions, a startup probe, requests, limits, and pod/container security contexts. Preserve a drill timeline showing endpoint removal and zero readiness-induced restarts.

<EvidenceCard
  command="kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -"
  artifact="rendered manifests, rollout status, and rollback evidence"
  invariant="unready workloads receive no traffic and credentials stay outside Git"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="rendered manifests, rollout status, and rollback evidence"
  interview-question="How do readiness, liveness, requests, limits, and rollout strategy interact?"
/>
