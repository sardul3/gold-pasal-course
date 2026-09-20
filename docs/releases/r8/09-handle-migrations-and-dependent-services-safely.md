---
id: r8-09
title: "Handle migrations and dependent services safely"
release: r8
order: 9
prerequisites: [r8-08]
outcomes:
  - Apply handle migrations and dependent services safely to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Handle migrations and dependent services safely


During a rolling release, old and new Gold Pasal pods overlap. A database migration must therefore be compatible with both versions. “The migration ran” is not enough if old code can no longer read the schema.

## See the idea first

For a renamed column, first add the new nullable column and deploy code that can tolerate both shapes. Backfill data separately. Switch reads and writes only after observation. Remove the old column in a later release after rollback to old code is no longer required.

Run migrations as one bounded operation, not independently in every API replica:

```yaml
apiVersion: batch/v1
kind: Job
spec:
  backoffLimit: <bounded-retries>
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/example/gold-pasal@sha256:<same-release-digest>
```

The Job must use the same reviewed artifact, external secret references, deadline, and observable logs. An init container per replica risks lock contention and ties API scaling to schema mutation.

Readiness may depend on the database if the API cannot safely serve without it; liveness should not. A database outage should drain traffic, not create a restart storm.

<FailureWorkbench incident="New pods are Ready, but old pods fail queries during rollout." :hypotheses="['migration removed an old field too early', 'old and new transaction assumptions conflict', 'backfill is incomplete']" next-evidence="Compare migration history, both application versions, and database errors before continuing rollout." />

## Practice

On a disposable database, stop a migration halfway or make it fail. Prove retry behavior is safe, the API does not claim readiness against an unsupported schema, and rollback does not require destructive down-migrations.

<PredictThenRun prompt="Which schema versions can the previous and new API images safely run against during the overlap window?">

</PredictThenRun>

## Public evidence

```bash
kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -
kubectl wait --for=condition=complete job/<migration-job> --timeout=5m
```

Keep migration test results, Job completion, schema version, and an old/new compatibility test. Never publish connection strings in those artifacts.

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
