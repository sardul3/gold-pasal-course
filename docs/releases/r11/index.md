---
title: "R11: Bounded staff agent"
description: "A traced agent with typed tools, approvals, and stop conditions enforced in code."
---

# R11: Bounded staff agent

**What you'll have:** HTTP-backed tools; allowlists and budgets; confirmation before holds; durable run state; redacted traces; golden trajectories; red-team cases.

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

## Before you start

You finished [R10](/releases/r10/): ChatModel, evals, kill switch. Checkout remains the R5 script.

## Guide

| Page | You will be able to |
| --- | --- |
| [Workflow or agent](01-workflow-or-agent) | leave checkout as a script |
| [Typed tools via the API](02-typed-tools-via-the-api) | search and preview hold over HTTP |
| [Budgets and allowlists](03-budgets-and-allowlists) | cap steps and reject unknown tools |
| [Confirm before inventory writes](04-confirm-before-inventory-writes) | awaiting_approval |
| [Persist run state](05-persist-run-state) | survive restart |
| [Trace without leaking secrets](06-trace-without-leaking-secrets) | redacted JSON logs |
| [Golden trajectories](07-golden-trajectories) | score tool lists |
| [Red-team the agent](08-red-team-the-agent) | fail closed |
| [Release gate: stop conditions](09-release-gate-stop-conditions) | demo confirm and reject |

## Release evidence

```bash
uv run pytest tests/evals/agent -q
```
