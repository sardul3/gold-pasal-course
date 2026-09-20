---
id: r9-08
title: "Run post-deployment smoke checks and surface failure clearly"
release: r9
order: 8
prerequisites: [r9-07]
outcomes:
  - Apply run post-deployment smoke checks and surface failure clearly to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Run post-deployment smoke checks and surface failure clearly


Sync and health prove Kubernetes accepted the desired objects. A smoke check proves a small user-visible path works through the real Ingress after deployment.

## See the idea first

Choose one read-only endpoint with stable assertions: TLS succeeds, status is expected, content type is correct, and a small response field has the expected shape.

```bash
curl --fail --show-error --silent \
  --connect-timeout 5 --max-time 15 \
  https://api.<homelab-domain>/ready
```

Run this from inside the homelab network, such as a narrowly scoped runner or Argo hook. Do not open the private cluster to GitHub. Bound retries and retain each failure; retry-until-green hides an unstable release.

On failure, surface Argo revision, expected digest, HTTP status, response excerpt without sensitive fields, Deployment conditions, and pod events.

<FailureWorkbench incident="Argo reports Healthy but smoke returns 503." :hypotheses="['Ingress has no Ready backend', 'NetworkPolicy blocks controller traffic', 'application readiness does not cover its serving dependency']" next-evidence="Inspect EndpointSlices, Ingress/controller status, then application logs for the same timestamp." />

## Practice

Use a wrong smoke path. Confirm the release evidence marks failure clearly and does not print tokens or the entire environment. Restore the path and capture recovery.

<PredictThenRun prompt="Which facts will distinguish DNS, TLS, Ingress, Service, readiness, and application failures?">

</PredictThenRun>

## Public evidence

```bash
argocd app wait gold-pasal --sync --health --timeout 300
curl --fail --show-error --max-time 15 https://api.<homelab-domain>/ready
```

Attach timestamp, Git revision, running digest, endpoint, status, and bounded latency to the release record.

<EvidenceCard
  command="gh run watch --exit-status"
  artifact="a PR, green workflow, image digest, GitOps diff, and deployment smoke result"
  invariant="build once, promote by digest, and roll back through reviewed Git history"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a PR, green workflow, image digest, GitOps diff, and deployment smoke result"
  interview-question="Why prefer pull-based GitOps for a private homelab?"
/>
