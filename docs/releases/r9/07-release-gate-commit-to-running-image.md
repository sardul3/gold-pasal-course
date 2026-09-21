---
id: r9-07
title: "Release gate: commit to running image"
release: r9
order: 7
prerequisites: [r9-06]
outcomes:
  - Trace commit to digest to Pod imageID
  - Show a rollback path by digest
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="delivery owner"
  problem="A reviewer asks you to trace the Pod's imageID back to a GitHub commit. You have a kind cluster and a feeling."
  destination="One SHA: green jobs, GHCR digest, manifest, running imageID, smoke 200."
/>

# Release gate: commit to running image

This is the release gate. Pick one commit on `main`. Show the Actions run, the digest, `deployment.yaml`, `kubectl` imageID, and smoke. Argo CD is not required. The course site already deploys from this repo's own workflow; do not mix that evidence with gold-pasal.

## See the idea first

From `gold-pasal`:

```bash
kubectl get pod -l app=gold-pasal-api -o jsonpath='{.items[0].status.containerStatuses[0].imageID}{"\\n"}'
```

```text
ghcr.io/<you>/gold-pasal-api@sha256:...
```

That sha256 must equal the line in deploy/kind/deployment.yaml.

## Trace

1. GitHub commit SHA
2. `application-ci` run for that SHA (unit, inventory, publish)
3. Digest from publish
4. Manifest on `main`
5. Pod imageID
6. `./scripts/smoke-kind.sh`

Then show the previous digest still in git history and GHCR.

Optional: [Argo CD GitOps](/side-quests/argo-cd-gitops) if you want a controller to pull. Not a gate.

R10 starts the assistant. It does not change how you publish this API image.

## Compare the three identities

Write the git SHA, the GHCR digest, and the Pod imageID on one line each. If any two differ, stop and apply the YAML from `main` again. A tag like `:r7` on the Pod means you never finished the promotion PR.

The course site on GitHub Pages is a different repository and a different workflow. Do not mix that run URL into this gate.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| imageID is docker.io/library/... | still on the laptop :r7 tag | Promote a GHCR digest |
| SHA does not match the run | you applied a different commit | checkout main; apply again |

## Practice

<LessonQuiz
  question="Which identity must match across GHCR, Git, and the Pod?"
  a="The kind node name"
  b="The image sha256 digest"
  c="The VitePress base path"
  d="The Ollama model name"
  correct="b"
>

That is the artifact. Tags and cluster names are labels around it.

</LessonQuiz>

<EvidenceCard
  command="./scripts/smoke-kind.sh && kubectl get pod -l app=gold-pasal-api -o jsonpath='{.items[0].status.containerStatuses[0].imageID}'"
  artifact="one SHA, one digest, matching Pod, smoke transcript"
  invariant="Build once. Promote by digest. Roll back by digest."
/>
