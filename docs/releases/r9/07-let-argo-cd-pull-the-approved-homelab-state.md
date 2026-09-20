---
id: r9-07
title: "Let Argo CD pull the approved homelab state"
release: r9
order: 7
prerequisites: [r9-06]
outcomes:
  - Apply let argo cd pull the approved homelab state to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Let Argo CD pull the approved homelab state


Argo CD runs inside the homelab and pulls reviewed state. GitHub never needs inbound network access, a kubeconfig, or permission to mutate the private cluster.

## See the idea first

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  source:
    repoURL: <reviewed-repository>
    targetRevision: <protected-branch>
    path: deploy/overlays/homelab
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

`path` must be exactly the reviewed homelab overlay. `prune` removes objects deleted from Git; that is useful and deserves careful review. Restrict destination namespace and Argo CD project permissions.

Repository credentials belong in Argo CD's secret store, not in the Application manifest. GHCR pull credentials likewise remain external to Git.

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k argocd
argocd app get gold-pasal
argocd app diff gold-pasal
```

The course check loads `deploy/argocd/*.yaml`, verifies an Application points at `deploy/overlays/homelab`, and requires automated pruning.

<FailureWorkbench incident="The promotion merged, but Argo CD remains OutOfSync." :hypotheses="['repository fetch failed', 'manifest render failed', 'destination authorization denied']" next-evidence="Read Application conditions and controller logs before forcing a sync." />

## Practice

In a training Application, use a nonexistent source path. Observe the comparison error, correct the Git declaration, and let Argo CD recover by pulling again.

<PredictThenRun prompt="Which component holds cluster credentials, and which reviewed Git field tells it what to deploy?">

</PredictThenRun>

## Public evidence

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k argocd
argocd app wait gold-pasal --sync --health --timeout 300
```

Record Git revision, sync revision, health, and approved digest. Redact repository tokens and internal addresses.

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
