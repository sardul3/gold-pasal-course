---
id: r8-04
title: "Manage configuration and secrets without committing credentials"
release: r8
order: 4
prerequisites: [r8-03]
outcomes:
  - Apply manage configuration and secrets without committing credentials to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Manage configuration and secrets without committing credentials


FastAPI configuration names may live in Git; credentials must not. Gold Pasal should commit a reference to externally managed secret material, never a Kubernetes `Secret` containing `data` or `stringData`.

## See the idea first

Non-sensitive settings can come from a ConfigMap. A secret operator can reconcile an `ExternalSecret`-style resource into a namespaced Secret at runtime:

```yaml
spec:
  target:
    name: gold-pasal-runtime
  data:
    - secretKey: DATABASE_PASSWORD
      remoteRef:
        key: <provider-path>
```

This commits only the lookup instruction. Base64 is encoding, not encryption; committing base64 under `Secret.data` still exposes plaintext to anyone who can clone the repository.

The Deployment consumes the generated Secret by name, without embedding a value:

```yaml
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: gold-pasal-runtime
        key: DATABASE_PASSWORD
```

The Python settings layer should fail during FastAPI startup if required configuration is absent. That is safer than quietly using a weak default.

## Inspect without disclosing

```bash
kubectl get externalsecret gold-pasal-runtime
kubectl describe externalsecret gold-pasal-runtime
kubectl get secret gold-pasal-runtime -o jsonpath='{.metadata.name}{"\n"}'
```

Do not print Secret values, paste them into logs, or use `kubectl get ... -o yaml` in public evidence.

<FailureWorkbench incident="The pod reports a missing datasource password." :hypotheses="['external provider key is absent', 'operator lacks permission', 'generated Secret key and Deployment reference differ']" next-evidence="Read ExternalSecret conditions and pod events; inspect names, not values." />

## Practice

In a disposable secret-store entry, use a nonexistent remote key. Observe that reconciliation fails and the workload does not become Ready. Restore the key reference.

<PredictThenRun prompt="Which condition should fail first: external-secret reconciliation, container startup, or readiness?">

</PredictThenRun>

## Public evidence

```bash
kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r8 --app-repo "$PWD" -k plaintext
```

The course check renders the homelab overlay and rejects committed Secret values. Pair that result with a Ready external-secret condition, never with the credential itself.

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
