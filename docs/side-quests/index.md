---
title: Side quests
description: Optional depth after the relevant core release is proven.
---

# Side quests stay optional

Choose a side quest because it strengthens the role you want, not because the core path hid a prerequisite.

## Prepare the gold-pasal bench

R0 and R1 assume `uv run python` already works in `gold-pasal`. If it does not, follow [How to freeze-sync the shop](/side-quests/prepare-the-gold-pasal-bench). Git and `application-ci` stay optional there.

## Homelab and Kustomize overlay

After [R8](/releases/r8/), add a Kustomize overlay for a metal or VM cluster. kind remains the core path. See [Homelab and Kustomize overlay](/side-quests/homelab-kustomize-overlay).

## Argo CD GitOps

After [R9](/releases/r9/), let a cluster controller pull the digest from Git. See [Argo CD GitOps](/side-quests/argo-cd-gitops).

## Thin TypeScript storefront

Generate a client from the R3 OpenAPI contract, build catalog and hold flows, and keep all pricing and authorization on the server. The [R13](/releases/r13/) capstone uses HTMX on FastAPI instead; this quest stays optional.

## Reliable order events

Add a transactional outbox, deliver order notifications at least once, and make the consumer idempotent.

## Temporal fulfillment workflow

Move a long-running fulfillment process into Temporal after the order state machine and failure semantics are already understood.

## International catalog

Add currency and weight boundaries without weakening the internal Money and Weight invariants.

## Pricing analytics

Use the classical ML path in `ai-sme-map` to analyze historical demand. Never let a model silently determine the auditable customer quote.

## Remote MCP

Add a remote transport and OAuth only after the local stdio server has contract tests, least-privilege tools, and explicit state-changing confirmation.
