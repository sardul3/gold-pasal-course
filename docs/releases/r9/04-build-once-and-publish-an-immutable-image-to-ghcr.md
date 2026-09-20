---
id: r9-04
title: "Build once and publish an immutable image to GHCR"
release: r9
order: 4
prerequisites: [r9-03]
outcomes:
  - Apply build once and publish an immutable image to ghcr to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Build once and publish an immutable image to GHCR


Build the Gold Pasal image once after gates pass, publish it to GHCR, and pass its registry digest to every later stage. Tags help humans browse; only `ghcr.io/...@sha256:...` identifies immutable bytes.

## See the idea first

```yaml
- name: Build and push
  id: image
  uses: docker/build-push-action@<pinned-commit>
  with:
    push: true
    tags: ghcr.io/<owner>/gold-pasal:${{ github.sha }}
    provenance: true
    sbom: true
```

Construct `GOLD_PASAL_IMAGE_REF` from the repository name and the action's digest output. Do not rebuild during promotion; rebuilding can change base-image bytes or timestamps even from the same source commit.

```bash
export GOLD_PASAL_IMAGE_REF='ghcr.io/<owner>/gold-pasal@sha256:<digest>'
docker buildx imagetools inspect "$GOLD_PASAL_IMAGE_REF"
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 --app-repo "$PWD" -k immutable_digest
```

The check requires `@sha256:` and confirms GHCR can resolve it. Keep package permissions scoped to this job and avoid running untrusted fork code with write credentials.

<FailureWorkbench incident="Promotion has a tag but cannot prove which bytes passed smoke." :hypotheses="['digest output was discarded', 'image was rebuilt later', 'test and publish jobs used different images']" next-evidence="Trace build metadata, digest output, and the image ID used by container smoke." />

## Practice

Run the delivery check with a tag-only value. Observe the explicit `GOLD_PASAL_IMAGE_REF` failure, then set the published digest and rerun.

<PredictThenRun prompt="What remains stable if a tag is moved after publication, and which reference must the manifest store?">

</PredictThenRun>

## Public evidence

```bash
GOLD_PASAL_IMAGE_REF="$GOLD_PASAL_IMAGE_REF" \
  uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k immutable_digest
```

Publish the commit SHA, workflow run, full digest reference, and registry inspection. The digest is public evidence; registry credentials are not.

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
