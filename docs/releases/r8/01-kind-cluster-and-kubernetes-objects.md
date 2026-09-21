---
id: r8-01
title: "kind cluster and Kubernetes objects"
release: r8
order: 1
prerequisites: []
outcomes:
  - Create a kind cluster named gold-pasal
  - Read a Kubernetes object as a desired-state document
evidence: [commit]
---

<LessonMission
  role="platform operator"
  problem="Compose is one laptop. A job posting talks about Pods and Deployments. You have no cluster, and a homelab rack is not required."
  destination="A local kind cluster is running, and you can explain Pod, Deployment, Service, and Ingress as YAML desired state."
/>

# kind cluster and Kubernetes objects

**kind** (Kubernetes in Docker) runs a cluster inside Docker containers on this machine. You need Docker from R7 plus `kind` and `kubectl`. A Kubernetes object is YAML that says what should exist: kind, metadata, spec. The control plane keeps making the cluster match that spec. The same objects show up later on EKS, GKE, or Cloud Run's Kubernetes-shaped APIs; this course uses kind so everyone can finish without extra hardware.

## See the idea first

From `gold-pasal`:

```bash
kind --version && kubectl version --client
```

```text
kind v0.27.0 go1.x
Client Version: v1.32.x
```

If either command is missing: macOS `brew install kind kubectl`. kind needs Docker running.

## Create the cluster

```bash
kind create cluster --name gold-pasal
kubectl cluster-info --context kind-gold-pasal
kubectl get nodes
```

```text
NAME                       STATUS   ROLES           AGE   VERSION
gold-pasal-control-plane   Ready    control-plane   30s   v1.32.x
```

A **Pod** is the smallest unit that runs a container. You almost never create a Pod by itself. A **Deployment** says how many Pod copies to keep. A **Service** is a stable DNS name and port in front of those Pods. An **Ingress** is HTTP routing from outside.

Homelab metal and Kustomize overlays are a [side quest](/side-quests/homelab-kustomize-overlay), not a gate. Cloud vendors wrap these objects; they do not replace them.

Load the R7 image into kind so later pages do not pull from a registry yet:

```bash
kind load docker-image gold-pasal-api:r7 --name gold-pasal
```

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `kind: command not found` | CLI missing | Install kind; confirm Docker is running |
| node NotReady | cluster still starting | Wait and `kubectl get nodes` again |

## Practice

<LessonQuiz
  question="What is kind in this course?"
  a="A managed EKS account you must buy"
  b="A local Kubernetes cluster running in Docker"
  c="A replacement for the Dockerfile"
  d="Argo CD"
  correct="b"
>

kind is Kubernetes-in-Docker. It is the primary path. Homelab is optional.

</LessonQuiz>

Next: [Deployment and Service](02-deployment-and-service).

<EvidenceCard
  command="kubectl get nodes --context kind-gold-pasal"
  artifact="kind cluster gold-pasal with one Ready node"
  invariant="You can finish R8 on a laptop with Docker. Homelab hardware is optional."
/>
