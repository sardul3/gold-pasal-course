---
title: Argo CD GitOps
description: Optional pull-based deploy for people who want a controller to sync Git to a cluster.
---

# Argo CD GitOps

This page is optional. [R9](/releases/r9/) already deploys by merging a digest into Git and applying (or loading into kind). Finish that gate first.

**Argo CD** is a controller inside the cluster that pulls desired state from Git. GitHub never needs a kubeconfig. That is useful on a private homelab. It is extra machinery on a laptop kind cluster.

## What you'll have

An Argo CD Application that points at `deploy/overlays/kind` or `deploy/overlays/homelab`, syncs on commit, and shows OutOfSync when Git and the cluster disagree.

## Before you start

R9 smoke must pass with a digest in the manifest. You need a cluster that can reach GitHub (or a Git mirror) and GHCR.

Install Argo CD from the [upstream getting started guide](https://argo-cd.readthedocs.io/en/stable/getting_started/). Do not copy vendor YAML into a lesson here; versions move.

## Application

Point `spec.source.path` at the overlay you actually use. Enable prune only if you understand it deletes objects removed from Git.

Repository credentials belong in Argo CD's secret store, not in the Application manifest.

## Rollback

Rollback is still a Git revert of the digest, the same as R9. Argo pulls the revert. Do not `kubectl set image` and then wonder why Argo overwrote you.

## What this is not

This is not an R9 requirement. A kind apply from merged Git is enough to graduate the core path.
