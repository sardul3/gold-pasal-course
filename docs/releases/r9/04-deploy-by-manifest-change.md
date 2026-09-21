---
id: r9-04
title: "Deploy by manifest change"
release: r9
order: 4
prerequisites: [r9-03]
outcomes:
  - Replace the kind image field with a digest
  - Change environments only by merging YAML
evidence: [pull-request, deployment]
---

<LessonMission
  role="delivery owner"
  problem="Someone ran kubectl set image on kind from a laptop. Git still says image: gold-pasal-api:r7. The cluster drifted."
  destination="deploy/kind/deployment.yaml names a GHCR digest. A PR is how that digest changes."
/>

# Deploy by manifest change

**Promotion** is a reviewed Git change to desired state. CI does not `kubectl apply` to a private cluster (and does not need a kubeconfig). You pull the digest, `kind load` if needed, and apply the merged YAML, or you apply from the laptop after merge. Argo CD would pull for you; that is a [side quest](/side-quests/argo-cd-gitops), not this gate.

## See the idea first

From `gold-pasal`:

```bash
grep image: deploy/kind/deployment.yaml
```

```text
          image: gold-pasal-api:r7
```

Change that line to `ghcr.io/<you>/gold-pasal-api@sha256:...` and set `imagePullPolicy: IfNotPresent` after you load it, or use a kind pull-through workflow you document.

## The PR

1. Copy the digest from the green publish job
2. Edit `deploy/kind/deployment.yaml`
3. Open a PR that contains only that image line (and pull policy if needed)
4. After merge, `kubectl apply -f deploy/kind/`

```bash
kubectl get pod -l app=gold-pasal-api -o jsonpath='{.items[0].status.containerStatuses[0].imageID}{"\n"}'
```

The imageID must contain the same sha256 as the YAML.

Do not `kubectl set image` in CI. That bypasses review and leaves Git lying.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| ErrImagePull | kind cannot reach GHCR | kind load the digest, or authenticate the cluster to GHCR |
| imageID does not match | you applied old YAML | kubectl apply again from main |

## Practice

<LessonQuiz
  question="How does the running digest change in this course?"
  a="kubectl set image in the publish job"
  b="A reviewed commit that changes the manifest digest, then apply"
  c="Editing the Dockerfile ENV"
  d="Argo CD is required"
  correct="b"
>

Git is the desired state. Argo is optional automation of the pull.

</LessonQuiz>

Next: [Smoke after deploy](05-smoke-after-deploy).

<EvidenceCard
  command="grep sha256 deploy/kind/deployment.yaml"
  artifact="PR that only bumps the image digest"
  invariant="Cluster state matches Git after apply. CI does not SSH into kind."
/>
