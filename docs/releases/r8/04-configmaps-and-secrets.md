---
id: r8-04
title: "ConfigMaps and Secrets"
release: r8
order: 4
prerequisites: [r8-03]
outcomes:
  - Mount or envFrom a ConfigMap for non-secret Settings
  - Create a Secret from the command line and reference it
evidence: [deployment]
---

<LessonMission
  role="platform operator"
  problem="The Deployment has no GOLD_PASAL_DATABASE_URL. Pods crash or /ready fails, and someone is about to commit a token in YAML."
  destination="Non-secret settings in a ConfigMap. Tokens in a Secret that is not committed."
/>

# ConfigMaps and Secrets

A **ConfigMap** holds non-secret config as key/value data you can commit. A **Secret** holds tokens. Kubernetes Secrets are base64, not encryption at rest unless you add that. Still: do not put `dev-staff` tokens in Git. Create the Secret locally.

## See the idea first

From `gold-pasal`:

```bash
kubectl create secret generic gold-pasal-tokens --from-literal=staff=dev-staff --from-literal=customer=dev-customer --dry-run=client -o yaml | head
```

```text
apiVersion: v1
kind: Secret
metadata:
  name: gold-pasal-tokens
...
```

`--dry-run=client` prints YAML without storing it. Apply without dry-run on the cluster only. Add `secret.yaml` to `.gitignore` if you write it to disk.

## Wire env into the container

In the Deployment, under the container:

```yaml
          envFrom:
            - configMapRef:
                name: gold-pasal-config
            - secretRef:
                name: gold-pasal-tokens
```

Map keys to the names `Settings` already uses (`GOLD_PASAL_STAFF_TOKEN`, and so on) either by naming the Secret keys that way or with explicit `env:` `valueFrom`.

For Postgres on kind you can run a postgres Deployment with its own Secret for `POSTGRES_PASSWORD`, or keep using Compose Postgres and set the URL to `host.docker.internal` (Docker Desktop). Pick one path and document it in `deploy/kind/README.md`. Do not commit passwords.

```bash
kubectl apply -f deploy/kind/configmap.yaml
kubectl apply -f deploy/kind/deployment.yaml
kubectl rollout restart deployment/gold-pasal-api
```

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| CreateContainerConfigError | missing ConfigMap or Secret | kubectl get configmap,secret; apply the missing object |
| token in git status | Secret file committed | gitignore it; `git rm --cached` |

## Practice

<LessonQuiz
  question="Why not commit the staff token in deployment.yaml?"
  a="YAML cannot hold strings"
  b="Git history would keep the secret even after you delete the line"
  c="Kubernetes ignores env vars from Git"
  d="kind forbids Secrets"
  correct="b"
>

Anything committed can leak in forks and CI logs. Create Secrets on the cluster or from a sealed-secret tool later. This course uses kubectl create from local literals.

</LessonQuiz>

Next: [Probes, requests, and limits](05-probes-requests-and-limits).

<EvidenceCard
  command="kubectl get secret gold-pasal-tokens"
  artifact="ConfigMap in Git, Secret created locally"
  invariant="Credentials stay outside Git."
/>
