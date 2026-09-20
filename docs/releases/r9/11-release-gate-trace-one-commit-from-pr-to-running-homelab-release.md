---
id: r9-11
title: "Release gate: trace one commit from PR to running homelab release"
release: r9
order: 11
prerequisites: [r9-10]
outcomes:
  - Apply release gate: trace one commit from pr to running homelab release to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Release gate: trace one commit from PR to running homelab release


This gate traces one commit through review, tests, immutable publication, security evidence, reviewed promotion, Argo CD pull, smoke, and rollback. Every arrow must carry an identity you can compare.

## See the idea first

Collect:

1. application PR and reviewed commit SHA;
2. green unit, integration, contract, migration, and container-smoke jobs;
3. full `GOLD_PASAL_IMAGE_REF` with `@sha256:`;
4. dependency, secret, image scan, provenance, and downloaded SBOM;
5. promotion PR whose rendered overlay contains that exact reference;
6. Argo CD sync revision and Healthy status;
7. running pod `imageID` and post-deployment smoke result;
8. independent Pages URL and workflow evidence.

```bash
export GITHUB_RUN_ID="$(
  gh run list --workflow application-ci --status success --limit 1 \
    --json databaseId --jq '.[0].databaseId'
)"
rm -rf evidence/release
gh run download "$GITHUB_RUN_ID" --name release-evidence --dir evidence/release
export GOLD_PASAL_IMAGE_REF="$(cat evidence/release/image-ref.txt)"
export GOLD_PASAL_SBOM_PATH="$PWD/evidence/release/sbom.spdx.json"
export GOLD_PASAL_PROVENANCE_PATH="$PWD/evidence/release/provenance.intoto.json"
export GOLD_PASAL_DEPLOYED_URL="$(cat evidence/release/deployed-url.txt)"
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD"
```

Name the workflow and artifact exactly as shown, or change the command and check documentation together. The SBOM root component and signed provenance subject must name the promoted image and digest. The homelab Deployment injects that digest as `GOLD_PASAL_IMAGE_DIGEST`; `/health` returns it in `X-Gold-Pasal-Image-Digest`, connecting the ingress response to the selected running pod.

## Witness the pull path

Explain why GitHub publishes to GHCR and Git, but does not push into the private cluster. Show Argo CD reading `deploy/overlays/homelab`, then compare:

```bash
argocd app get gold-pasal
kubectl get pods -l app=gold-pasal-api \
  -o jsonpath='{range .items[*]}{.status.containerStatuses[0].imageID}{"\n"}{end}'
curl --fail --show-error --max-time 15 "$GOLD_PASAL_DEPLOYED_URL/ready"
curl --fail --show-error --include --max-time 15 \
  "$GOLD_PASAL_DEPLOYED_URL/health"
```

<FailureWorkbench incident="The release is Healthy, but the running digest differs from promotion evidence." :hypotheses="['Argo tracks a different revision', 'overlay replacement did not match', 'pod rollout has not completed']" next-evidence="Compare promotion render, Argo sync revision, Deployment template, and pod imageID before claiming release." />

## Practice

Promote a reversible failing candidate in the safe drill environment. Capture failed smoke and diagnosis. Revert the promotion commit to a previously verified digest, obtain review, let Argo pull it, and repeat digest plus smoke checks. Do not rebuild the old image or use a mutable tag.

<PredictThenRun prompt="At every handoff from PR to pod, which SHA, digest, revision, or artifact checksum proves continuity?">

</PredictThenRun>

## Public pass criteria

```bash
GOLD_PASAL_IMAGE_REF="$GOLD_PASAL_IMAGE_REF" \
GOLD_PASAL_SBOM_PATH="$GOLD_PASAL_SBOM_PATH" \
GOLD_PASAL_PROVENANCE_PATH="$GOLD_PASAL_PROVENANCE_PATH" \
GOLD_PASAL_DEPLOYED_URL="$GOLD_PASAL_DEPLOYED_URL" \
  uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD"
```

Pass only when all identities match, SBOM and provenance describe the promoted digest, smoke succeeds, rollback is witnessed, no secret appears in evidence, and Pages deploys independently.

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
