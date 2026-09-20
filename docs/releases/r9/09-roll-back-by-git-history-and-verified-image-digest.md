---
id: r9-09
title: "Roll back by Git history and verified image digest"
release: r9
order: 9
prerequisites: [r9-08]
outcomes:
  - Apply roll back by git history and verified image digest to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Roll back by Git history and verified image digest


Rollback is a new reviewed Git decision that restores the last verified digest. It does not rebuild old source, move a tag, or issue an imperative cluster command that Argo CD will later undo.

## See the idea first

Identify the last release whose digest, SBOM, provenance, migration compatibility, and smoke result are retained. Create a revert PR changing the homelab digest back to that exact value.

```bash
export GOLD_PASAL_IMAGE_REF='ghcr.io/<owner>/gold-pasal@sha256:<previous-digest>'
docker buildx imagetools inspect "$GOLD_PASAL_IMAGE_REF"
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD" -k 'immutable_digest or approved_digest'
```

Before rollback, check database compatibility. A destructive migration can make the previous application unsafe even when its image still exists. In that case, roll forward with a fix or restore data according to an approved recovery plan.

After merge, Argo pulls the reverted state. Wait for sync and health, verify running `imageID`, then rerun smoke. Keep the failed release evidence; rollback should add history, not erase it.

<FailureWorkbench incident="A digest rollback starts, but old pods fail against the current schema." :hypotheses="['migration was not backward compatible', 'old secret/config contract was removed', 'rollback target lacked retained evidence']" next-evidence="Stop and compare schema/config compatibility before forcing availability." />

## Practice

Rehearse candidate promotion and revert in a safe environment. Time detection, PR approval, Argo convergence, and smoke recovery separately.

<PredictThenRun prompt="Which retained evidence makes the selected old digest a safe rollback target rather than merely an available image?">

</PredictThenRun>

## Public evidence

```bash
GOLD_PASAL_IMAGE_REF="$GOLD_PASAL_IMAGE_REF" \
  uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r9 \
  --app-repo "$PWD"
```

Record revert PR, old and failed digests, Argo revision, running image ID, migration decision, and post-rollback smoke result.

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
