---
id: r8-03
title: "Ingress on kind"
release: r8
order: 3
prerequisites: [r8-02]
outcomes:
  - Install the kind Ingress controller
  - Apply an Ingress for the API Service
evidence: [deployment]
---

<LessonMission
  role="platform operator"
  problem="port-forward is a debug tool. A shopper or a demo should hit an HTTP host name."
  destination="Ingress nginx on kind routes gold-pasal.local to the API Service."
/>

# Ingress on kind

An **Ingress** is a cluster object that maps host and path to a Service. kind does not include a controller by default. The [kind Ingress guide](https://kind.sigs.k8s.io/docs/user/ingress/) installs ingress-nginx and extra port mappings. Recreate the cluster once with those extraPortMappings if you skipped them, or follow that guide's extra-port config.

## See the idea first

From `gold-pasal`:

```bash
kubectl get pods -n ingress-nginx 2>/dev/null || echo 'controller not installed'
```

```text
controller not installed
```

Install the controller from the kind docs, wait until the ingress-nginx pod is Ready, then apply your Ingress.

## Ingress object

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gold-pasal-api
spec:
  ingressClassName: nginx
  rules:
    - host: gold-pasal.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gold-pasal-api
                port:
                  number: 8000
```

Add `127.0.0.1 gold-pasal.local` to `/etc/hosts`. Then:

```bash
kubectl apply -f deploy/kind/ingress.yaml
curl -s -o /dev/null -w '%{http_code}\n' http://gold-pasal.local/health
```

TLS cert-manager is out of scope. HTTP on kind is enough. Homelab DNS and certificates live in the optional overlay side quest.

If curl still needs port-forward, the controller is not bound to the kind node's published ports. Fix the cluster create config rather than inventing a second Service type LoadBalancer.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| 404 from nginx | wrong host or path | Match host to /etc/hosts and the Ingress rule |
| connection refused on 80 | kind extraPortMappings missing | Recreate the cluster with the Ingress port mappings |

## Practice

<LessonQuiz
  question="What does an Ingress object do by itself, without a controller?"
  a="It always opens port 80 on the laptop"
  b="Nothing useful; a controller must implement the spec"
  c="It replaces the Deployment"
  d="It builds the Docker image"
  correct="b"
>

Ingress is desired state. ingress-nginx (or another controller) turns it into actual proxy routes.

</LessonQuiz>

Next: [ConfigMaps and Secrets](04-configmaps-and-secrets).

<EvidenceCard
  command="curl -s -o /dev/null -w '%{http_code}\n' http://gold-pasal.local/health"
  artifact="Ingress YAML plus a 200 from the host name"
  invariant="HTTP routing is declared in Git, not as a one-off port-forward."
/>
