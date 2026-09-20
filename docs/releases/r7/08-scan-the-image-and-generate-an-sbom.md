---
id: r7-08
title: "Scan the image and generate an SBOM"
release: r7
order: 8
prerequisites: [r7-07]
outcomes:
  - Apply scan the image and generate an sbom to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

# Scan the image and generate an SBOM


This is step 8 of 9. Inventory the promoted artifact and make vulnerability decisions from evidence.

## See the idea first

### “No critical findings” needs an artifact identity

A scan of `gold-pasal:latest` today may inspect a different image tomorrow. Record the immutable image digest, scanner version, vulnerability database time, and result together.

An **SBOM** (software bill of materials) is an inventory of packages and versions in an artifact. A vulnerability scan compares that inventory with known advisories. An SBOM is not a vulnerability report, and a clean scan does not prove the application has no security defects.

<FailureWorkbench incident="A critical advisory appears but the team cannot tell whether the released image contains the affected package." :hypotheses="['the package is absent', 'it exists only in the builder stage', 'the runtime contains the affected version']" next-evidence="Generate an SBOM for the exact runtime digest and locate package name, version, and layer." />

## Hand-check one finding

For each significant finding, record:

```text
image digest
package and installed version
advisory identifier and severity
fixed version, if any
runtime reachability or exposure
decision, owner, and review date
```

Severity is input to judgment, not the entire decision. Do not suppress a finding merely because the lesson wants a green command.

## Learner work: scan what you run

Build the final runtime image. Capture its digest. Generate an SBOM in a standard machine-readable format, then run the project-approved scanner against that digest.

Before changing dependencies or base image, preserve the initial report. Investigate findings. Apply the smallest justified update, rebuild, and verify application and container checks before rescanning.

<PredictThenRun prompt="If a compiler package exists in the builder but not the final runtime SBOM, should a runtime scan report it? What would its presence reveal?">

Compare SBOMs before and after. Explain every material package change, not just the vulnerability count.

</PredictThenRun>

## Walk through promotion evidence

The image digest connects build, tests, SBOM, scan, and later deployment. A mutable tag is a convenient name, not identity. Store artifacts where reviewers can confirm they refer to the same digest.

## Practice

Locate Python, the web framework, and one transitive package in the SBOM. Predict which dependency introduced the transitive package, then verify from lockfile or package metadata.

## Worked answer

Build-only compilers should not appear in the runtime SBOM. If they do, the stage boundary copied more than intended. A release decision cites the exact digest and explains unresolved findings rather than declaring the image “secure.”

## Check

```bash
docker image inspect gold-pasal:course-acceptance --format '{{.Id}}'
```

If a local-only image has no repository digest, record its immutable image ID and obtain a registry digest at promotion. Preserve the SBOM and scan alongside that identity.

<EvidenceCard
  command="docker image inspect gold-pasal:course-acceptance --format '{{.Id}}'"
  artifact="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  invariant="the image is immutable, non-root, and contains no development secrets"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an image digest, SBOM, scan result, and clean-machine smoke transcript"
  interview-question="What makes a container image reproducible and safe to promote?"
/>
