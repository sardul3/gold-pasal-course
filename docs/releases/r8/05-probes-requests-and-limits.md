---
id: r8-05
title: "Probes, requests, and limits"
release: r8
order: 5
prerequisites: [r8-04]
outcomes:
  - Add readiness and liveness probes to the API container
  - Set requests and limits so the Pod can schedule on kind
evidence: [deployment]
---

<LessonMission
  role="platform operator"
  problem="A Pod that cannot reach Postgres still gets Service traffic because there is no readinessProbe."
  destination="readinessProbe hits /ready, livenessProbe hits /health, and the container has CPU and memory requests."
/>

# Probes, requests, and limits

A **readinessProbe** that fails removes the Pod from the Service endpoints. A **livenessProbe** that fails restarts the container. **requests** tell the scheduler how much CPU and memory to reserve. **limits** cap usage. On a small kind node, keep requests modest (`100m` CPU, `256Mi` memory) or the Pod stays Pending.

## See the idea first

From `gold-pasal`:

```bash
kubectl get endpoints gold-pasal-api -o yaml | head
```

```text
subsets:
- addresses:
  - ip: 10.244.0.x
```

If `notReadyAddresses` is filled, the Pod is running but not ready. That is the probe story.

## Probe YAML

```yaml
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            periodSeconds: 20
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
```

Do not point liveness at /ready. A database blip would kill the process in a loop.

```bash
kubectl apply -f deploy/kind/deployment.yaml
kubectl rollout status deployment/gold-pasal-api
```

Scale Postgres down (or break the URL) and watch `kubectl get endpoints`. The Pod should leave Ready. Restore the URL and watch it return.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| CrashLoopBackOff from liveness | liveness hits /ready | Use /health for liveness |
| Pending indefinitely | requests larger than the kind node | Lower requests |

## Practice

<LessonQuiz
  question="Which probe should call GET /ready?"
  a="livenessProbe"
  b="readinessProbe"
  c="startupProbe only, always"
  d="none; Services ignore probes"
  correct="b"
>

Readiness controls traffic. Liveness restarts. /ready includes Postgres, so it belongs on readiness.

</LessonQuiz>

Next: [Roll out and roll back](06-roll-out-and-roll-back).

<EvidenceCard
  command="kubectl get pod -l app=gold-pasal-api -o jsonpath='{.items[0].status.conditions}'"
  artifact="Deployment with probes and resources"
  invariant="Unready Pods receive no Service traffic."
/>
