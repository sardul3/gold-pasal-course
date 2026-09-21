# ADR 0002: Local kind, OpenAI adapter, HTMX capstone, and R14

- Status: Accepted
- Date: 2026-09-21

## Context

R0 through R5 teach a job-shaped backend: Python, tests, FastAPI, PostgreSQL, transactions, auth, and replay-safe checkout. The original R6-R13 plan then spent most of its remaining pages on a homelab Kubernetes cluster, Argo CD GitOps, and a local-only Ollama assistant, and it ended with a portfolio polish release.

That weighting under-served three things the course's stated goal needs:

- Git branches, pull requests, and code review, which R0 now only introduces as a first commit
- A hosted-model adapter an FDE actually calls, with CI kept free of paid network
- A release that integrates someone else's messy system and demos it to a non-engineer

The homelab cluster is also a hardware prerequisite many learners will not have.

## Decision

Keep one shop repository and one gate per release. Rebalance the back half as follows.

1. **R6** is team workflow and production confidence: branches, pull requests, rebase and conflicts, GitHub Actions with a PostgreSQL service for `tests/inventory`, request ids, `/ready`, structured logs, layered tests with `EXPLAIN`, and an incident gate.
2. **R8** uses a local **kind** cluster as the primary Kubernetes path. Homelab and Kustomize overlays become optional. One concept page maps the same objects to EKS, GKE, or Cloud Run.
3. **R9** delivers by GitHub Actions, GHCR, and a reviewed manifest change. Argo CD moves to a side quest.
4. **R10** keeps the local assistant and adds async Python plus an **OpenAI** adapter behind the same Protocol. CI uses recorded fixtures and never calls a paid API.
5. **R13** is a forward-deployed integration capstone: a mock customer system, an adapter, a runbook, and a thin **HTMX** UI served by FastAPI.
6. **R14** (new) is the portfolio and interview release that currently lives in R13.

R7, R11, and R12 stay on their topics and shrink where pages repeat.

## Consequences

- Learners can finish Kubernetes without homelab hardware.
- Integration tests in R4 and R5 stop being laptop-only once R6's CI job exists.
- Adding R14 changes the constellation from fourteen releases to fifteen.
- R7-R14 pages now follow the same live-session contract as R0-R6. They are still shorter than a full lab rewrite of every command against a frozen gold-pasal SHA; deepen them in place as the application catches up.
