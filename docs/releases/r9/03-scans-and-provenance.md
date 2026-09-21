---
id: r9-03
title: "Scans and provenance"
release: r9
order: 3
prerequisites: [r9-02]
outcomes:
  - Generate an SBOM for the published image
  - Attach provenance and run a vulnerability scan
evidence: [ci-run]
---

<LessonMission
  role="delivery owner"
  problem="The image is on GHCR. Nobody knows whether it contains a critical CVE or who built it."
  destination="CI writes an SBOM and a provenance attestation, and a scanner fails the job on HIGH findings you have not waived."
/>

# Scans and provenance

An **SBOM** (software bill of materials) lists packages in the image. **Provenance** says which workflow and commit built it (`actions/attest-build-provenance`). A scanner such as Trivy can fail the job. You are not aiming for zero CVEs in the base image forever; you are aiming for a recorded list and a policy.

## See the idea first

From `gold-pasal`:

```bash
which trivy || echo 'install in CI'
```

```text
install in CI
```

Run Trivy in the publish job against the digest you just pushed. Do not scan only the laptop image.

## Job sketch

<div v-pre>

```yaml
      - uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ghcr.io/${{ github.repository }}-api@${{ steps.build.outputs.digest }}
          format: table
          exit-code: "1"
          severity: CRITICAL
      - uses: actions/attest-build-provenance@v2
        with:
          subject-name: ghcr.io/${{ github.repository }}-api
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true
```

</div>

Pin action versions by digest when you can. SBOM: `trivy image --format spdx-json` uploaded as an artifact.

R7 skipped scans so the container pages could stay on Dockerfile and Compose. They belong here, next to the digest you will deploy.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Trivy fails on the base image | CRITICAL in debian/python | Bump the base digest, or document a waiver with an expiry |
| attest denied | missing id-token: write | Add `id-token: write` and `attestations: write` |

## Practice

<LessonQuiz
  question="Why scan the published digest, not only the local Dockerfile?"
  a="Trivy cannot read Dockerfiles"
  b="The digest is what kind will run; layers can differ from an unpushed build"
  c="GHCR requires a scan by law"
  d="kind rejects unsigned YAML"
  correct="b"
>

Build once, scan that artifact. A second local build is a different artifact.

</LessonQuiz>

Next: [Deploy by manifest change](04-deploy-by-manifest-change).

<EvidenceCard
  command="ls dist || echo 'download SBOM artifact from the run'"
  artifact="SBOM artifact and provenance on the GHCR digest"
  invariant="The scan subject is the digest you promote."
/>
