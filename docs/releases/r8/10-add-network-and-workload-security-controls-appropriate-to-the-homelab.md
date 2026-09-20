---
id: r8-10
title: "Add network and workload security controls appropriate to the homelab"
release: r8
order: 10
prerequisites: [r8-09]
outcomes:
  - Apply add network and workload security controls appropriate to the homelab to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Add network and workload security controls appropriate to the homelab


Homelab does not mean trusted. Limit what the Gold Pasal process can do and which workloads can reach it. Start from default denial, then add the smallest paths required for Ingress, DNS, PostgreSQL, and secret reconciliation.

## See the idea first

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: api
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities: { drop: ["ALL"] }
```

Use a writable `emptyDir` only for paths Python or an imported library genuinely needs, such as a deliberately configured temporary directory. A non-root declaration is meaningful only when the image can run that way.

## Constrain traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
spec:
  podSelector:
    matchLabels: { app: gold-pasal-api }
  policyTypes: [Ingress, Egress]
```

This skeleton selects the API and denies traffic unless rules allow it. Add narrowly selected ingress from the controller namespace and egress for cluster DNS plus the database destination and port. Verify that your CNI enforces NetworkPolicy; an accepted object is not proof of enforcement.

<FailureWorkbench incident="The hardened pod starts but never becomes Ready." :hypotheses="['read-only filesystem blocks a runtime path', 'egress policy blocks DNS', 'database destination labels or CIDR are wrong']" next-evidence="Inspect application errors and test DNS/database connectivity from an equivalently labeled debug pod." />

## Practice

From an unauthorized test pod, attempt the API connection and record failure. From the Ingress path, record success. Then deny DNS temporarily in a disposable namespace and identify the resulting FastAPI dependency or database connection error before restoring policy.

<PredictThenRun prompt="Which exact source, destination, protocol, and port should each allowed flow contain?">

</PredictThenRun>

## Public evidence

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r8 --app-repo "$PWD" -k operational_safety
kubectl get networkpolicy
```

The check requires pod and container security contexts with `runAsNonRoot`. Add positive and negative connectivity results to prove policy enforcement.

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
