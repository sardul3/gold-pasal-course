---
id: r8-03
title: "Route traffic through the homelab Ingress"
release: r8
order: 3
prerequisites: [r8-02]
outcomes:
  - Apply route traffic through the homelab ingress to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Route traffic through the homelab Ingress


The Service makes Gold Pasal reachable inside the cluster. An Ingress adds the homelab's HTTP boundary: host and path rules are translated by an Ingress controller into routes to that Service.

## See the idea first

The request path is client → Ingress controller → Service → Ready pod. An Ingress is only configuration; without a matching controller and `ingressClassName`, it does no routing.

```yaml
spec:
  ingressClassName: <homelab-controller-class>
  rules:
    - host: api.<homelab-domain>
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gold-pasal-api
                port:
                  name: http
```

The host must resolve to the controller's address. The backend name and port must identify the Service, not a pod. TLS termination belongs at this boundary; keep certificate private keys out of Git.

## Diagnose from inside out

```bash
kubectl get endpointslice -l kubernetes.io/service-name=gold-pasal-api
kubectl describe ingress gold-pasal-api
curl --resolve api.<homelab-domain>:443:<controller-ip> https://api.<homelab-domain>/ready
```

First prove the Service has endpoints. Then inspect accepted Ingress rules and controller events. Finally, bypass public DNS with `--resolve` while preserving the HTTP Host header and TLS server name.

<FailureWorkbench incident="The API works through the Service but the hostname returns 404." :hypotheses="['host rule differs from the request Host header', 'wrong ingress class', 'controller has not accepted the resource']" next-evidence="Describe the Ingress and inspect the controller logs for this namespace." />

## Practice

Send the same request once with the correct Host header and once with a different host. Predict which layer returns the second 404.

<PredictThenRun prompt="What evidence distinguishes an Ingress routing 404 from a FastAPI route 404?">

</PredictThenRun>

## Public evidence

```bash
kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -
curl --fail --show-error https://api.<homelab-domain>/ready
```

Save the accepted Ingress rule and an HTTP success from outside the cluster. Redact internal addresses if the evidence will be public.

<EvidenceCard
  command="kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -"
  artifact="rendered manifests, rollout status, and rollback evidence"
  invariant="unready workloads receive no traffic and credentials stay outside Git"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="rendered manifests, rollout status, and rollback evidence"
  interview-question="How do readiness, liveness, requests, limits, and rollout strategy interact?"
/>
