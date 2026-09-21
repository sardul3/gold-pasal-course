---
title: "R13: Forward-deployed integration"
description: "A customer CSV plus a quirky HTTP API, an adapter, HTMX demo, runbook, and a recorded stakeholder walkthrough."
---

# R13: Forward-deployed integration

**What you'll have:** a mock Mandala Trails system; a discovery note; an adapter; assistant and MCP using that data; a thin HTMX demo; a runbook; a stakeholder script.

<LessonMission
  role="forward-deployed engineer"
  problem="The product works on Gold Pasal's catalog. The customer has a CSV export and a quirky HTTP API."
  destination="An adapter, a demo a non-engineer can watch, and a runbook someone else can follow."
/>

## Before you start

You finished [R12](/releases/r12/): MCP and the agent talk to the Gold Pasal API. This release does not replace that API. It feeds it customer data.

The TypeScript storefront stays optional.

## Guide

| Page | You will be able to |
| --- | --- |
| [Meet the customer system](01-meet-the-customer-system) | run the messy mock |
| [Write the discovery note](02-write-the-discovery-note) | mapping and non-goals |
| [Build the customer adapter](03-build-the-customer-adapter) | Protocol at the edge |
| [Point assistant and MCP at it](04-point-assistant-and-mcp-at-it) | MT- SKUs in evals |
| [Serve an HTMX demo](05-serve-an-htmx-demo) | stakeholder UI |
| [Write the runbook](06-write-the-runbook) | start and rollback |
| [Record the stakeholder demo](07-record-the-stakeholder-demo) | 5-8 minute script |
| [Release gate: customer integration](08-release-gate-customer-integration) | all artifacts |

## Release evidence

```bash
uv run pytest tests/adapters/test_mandala.py tests/http/test_demo.py -q
```
