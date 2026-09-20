---
id: r8-06
title: "Package environments with Kustomize"
release: r8
order: 6
prerequisites: [r8-05]
outcomes:
  - Apply package environments with kustomize to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Package environments with Kustomize


Gold Pasal's common Kubernetes shape belongs in a base. Homelab-specific hostnames, replica counts, and image promotion belong in an overlay. Kustomize renders the combination without maintaining copied manifests.

## See the idea first

```text
deploy/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/homelab/
    ├── kustomization.yaml
    └── <small-patches>.yaml
```

An overlay should say what is different, not repeat the Deployment. Image replacement must preserve the immutable digest:

```yaml
images:
  - name: ghcr.io/example/gold-pasal
    newName: ghcr.io/<owner>/gold-pasal
    digest: sha256:<approved-digest>
```

The rendered YAML is the deployable truth. Review it before apply:

```bash
kubectl kustomize deploy/overlays/homelab > /tmp/gold-pasal-rendered.yaml
kubectl diff -f /tmp/gold-pasal-rendered.yaml
kubectl apply --dry-run=server -f /tmp/gold-pasal-rendered.yaml
```

`kubectl diff` exposes deletions and defaults that are invisible in a tiny patch. Never place generated Secret values in a generator committed to Git.

<FailureWorkbench incident="A homelab patch renders but silently drops a probe." :hypotheses="['JSON patch replaced the whole container list', 'patch target matched the wrong object', 'base changed beneath a positional patch']" next-evidence="Inspect the rendered Deployment, not only the overlay source." />

## Practice

Create a temporary patch with a misspelled target name. Render it and observe whether Kustomize fails or produces unchanged output. Remove the drill.

<PredictThenRun prompt="Which rendered fields must remain invariant when only the homelab replica count changes?">

</PredictThenRun>

## Public evidence

```bash
kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r8 --app-repo "$PWD"
```

Archive the rendered diff in CI. The r8 checks inspect rendered objects, so a safe-looking source patch cannot hide an unsafe final Deployment.

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
