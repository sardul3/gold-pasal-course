---
id: r8-08
title: "Diagnose Pending, CrashLoopBackOff, and unavailable Service scenarios"
release: r8
order: 8
prerequisites: [r8-07]
outcomes:
  - Apply diagnose pending, crashloopbackoff, and unavailable service scenarios to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Diagnose Pending, CrashLoopBackOff, and unavailable Service scenarios


Kubernetes status words point to different layers. Diagnose from evidence before editing YAML: `Pending` is usually scheduling or setup, `CrashLoopBackOff` is repeated process failure, and an unavailable Service is commonly selection, readiness, or port wiring.

## See the idea first

```bash
kubectl get deploy,rs,pods,svc,endpointslice
kubectl describe pod <pod>
kubectl logs <pod> --previous
kubectl get events --sort-by=.lastTimestamp
```

For `Pending`, read scheduler events: insufficient CPU differs from an unbound volume or missing image-pull Secret. For `CrashLoopBackOff`, inspect `lastState.terminated.reason`, exit code, current logs, and `--previous` logs. The backoff is a symptom, not the root cause.

When a Service has no endpoints, compare:

```bash
kubectl get svc gold-pasal-api -o jsonpath='{.spec.selector}'
kubectl get pods --show-labels
kubectl get endpointslice -l kubernetes.io/service-name=gold-pasal-api -o yaml
```

A matching pod may still be excluded because readiness is false. If endpoints exist, test the named `targetPort` and Uvicorn listener before investigating Ingress.

<FailureWorkbench incident="Gold Pasal is unavailable after a deployment." :hypotheses="['no pod was scheduled', 'the Python process exits', 'pods exist but the Service has no Ready endpoints']" next-evidence="Classify the first abnormal object in the Deployment-to-EndpointSlice chain." />

## Practice

Run each in a disposable namespace and restore it:

- request impossible CPU and capture the scheduler event;
- supply an invalid required Pydantic settings value and capture `--previous` logs;
- break the Service selector and capture an empty EndpointSlice.

<PredictThenRun prompt="For each drill, which single command produces the first decisive piece of evidence?">

</PredictThenRun>

## Public evidence

```bash
kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -
kubectl get deploy,pods,svc,endpointslice
```

Publish a redacted incident note with hypothesis, command, decisive output, fix, and recovery check. A screenshot of a green pod alone does not prove the route works.

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
