---
id: r9-06
title: "Promote by reviewed manifest change, not an imperative cluster command"
release: r9
order: 6
prerequisites: [r9-05]
outcomes:
  - Apply promote by reviewed manifest change, not an imperative cluster command to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Promote by reviewed manifest change, not an imperative cluster command


Promotion is a reviewed change to desired state: replace the homelab overlay's old digest with the already tested `GOLD_PASAL_IMAGE_REF`. Do not run `kubectl set image` from CI; that bypasses review and creates drift from Git.

## See the idea first

```yaml
images:
  - name: ghcr.io/<owner>/gold-pasal
    newName: ghcr.io/<owner>/gold-pasal
    digest: sha256:<approved-digest>
```

The promotion PR should contain the digest change and evidence links, not unrelated application edits. Render and prove the environment contains the full reference:

```bash
export GOLD_PASAL_IMAGE_REF='ghcr.io/<owner>/gold-pasal@sha256:<digest>'
kubectl kustomize deploy/overlays/homelab | grep -F "$GOLD_PASAL_IMAGE_REF"
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k approved_digest
```

The check renders `deploy/overlays/homelab` and requires the exact environment value. A tag, shortened digest, or digest in a comment will not pass.

<FailureWorkbench incident="The promotion PR is merged, but the rendered Deployment still uses the old digest." :hypotheses="['edited the base while overlay overrides it', 'image name does not match Kustomize replacement', 'wrong environment path changed']" next-evidence="Render the exact Argo CD source path and inspect its container image." />

## Practice

Set `GOLD_PASAL_IMAGE_REF` to a different valid digest and run the check. Confirm the mismatch blocks promotion before merge.

<PredictThenRun prompt="What should the promotion PR diff contain, and which evidence proves those exact bytes passed CI?">

</PredictThenRun>

## Public evidence

```bash
GOLD_PASAL_IMAGE_REF="$GOLD_PASAL_IMAGE_REF" \
  uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k approved_digest
```

Link the application build run, security evidence, promotion PR approval, and rendered diff.

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
