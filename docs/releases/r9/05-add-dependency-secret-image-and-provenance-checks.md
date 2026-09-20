---
id: r9-05
title: "Add dependency, secret, image, and provenance checks"
release: r9
order: 5
prerequisites: [r9-04]
outcomes:
  - Apply add dependency, secret, image, and provenance checks to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Add dependency, secret, image, and provenance checks


Delivery security is a chain, not one scanner. Check source dependencies, leaked credentials, the built image, its software bill of materials (SBOM), and provenance linking artifact to workflow and commit.

## See the idea first

- Dependency review detects newly introduced vulnerable packages.
- Secret scanning rejects credential-shaped content before merge.
- Image scanning inspects OS and application packages in the published digest.
- An SBOM inventories components for later incident response.
- Provenance records how the immutable artifact was produced.

Download evidence and test it explicitly:

```bash
export GOLD_PASAL_IMAGE_REF='ghcr.io/<owner>/gold-pasal@sha256:<digest>'
export GOLD_PASAL_SBOM_PATH="$PWD/evidence/gold-pasal.spdx.json"
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k 'immutable_digest or sbom'
```

`GOLD_PASAL_SBOM_PATH` must point to the downloaded artifact, not an empty placeholder. The course check accepts SPDX or CycloneDX JSON. Generate the SBOM from the same digest you scan and promote.

Define severity policy and an exception process with owner and expiry. Scanners can be wrong; silent `continue-on-error` is not risk management.

<FailureWorkbench incident="The workflow uploads an SBOM, but it describes a different build." :hypotheses="['SBOM generated before final image', 'tag moved', 'artifact names mixed across matrix jobs']" next-evidence="Compare SBOM subject digest, GOLD_PASAL_IMAGE_REF, provenance subject, and workflow SHA." />

## Practice

Use a documented fake credential fixture and a deliberately invalid SBOM path. Confirm the secret gate and SBOM check fail without exposing real data. Remove the fixture.

<PredictThenRun prompt="Which evidence links source commit, workflow identity, image digest, scan, and SBOM into one chain?">

</PredictThenRun>

## Public evidence

```bash
GOLD_PASAL_IMAGE_REF="$GOLD_PASAL_IMAGE_REF" \
GOLD_PASAL_SBOM_PATH="$GOLD_PASAL_SBOM_PATH" \
  uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k 'immutable_digest or sbom'
```

Retain scanner versions, policies, digest, SBOM artifact checksum, and provenance verification result.

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
