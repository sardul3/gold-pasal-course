---
title: "R12: Gold Pasal over MCP"
description: "A least-privilege stdio MCP server backed by the existing application API."
---

# R12: Gold Pasal over MCP

**What you'll have:** a stdio MCP server; catalog_search; optional resources/prompts; schema validation; confirm-gated holds; mapped errors; contract tests.

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without unrestricted database or shell access."
  destination="A stdio server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

## Before you start

You finished [R11](/releases/r11/): tools already call the API and holds need confirm. MCP is another harness, not a new domain.

Remote transport is a side quest.

## Guide

| Page | You will be able to |
| --- | --- |
| [JSON-RPC and MCP](01-json-rpc-and-mcp) | name the protocol roles |
| [Start and stop a stdio server](02-start-and-stop-a-stdio-server) | run gold-pasal-mcp |
| [Typed tools and catalog search](03-typed-tools-and-catalog-search) | list and call search |
| [Resources and prompts](04-resources-and-prompts) | add them only if they fit |
| [Validate tool arguments](05-validate-tool-arguments) | reject before HTTP |
| [Idempotent hold with confirmation](06-idempotent-hold-with-confirmation) | same store rules |
| [Protocol errors and least privilege](07-protocol-errors-and-least-privilege) | map failures, no shell |
| [Inspector and contract tests](08-inspector-and-contract-tests) | fixtures in CI |
| [Release gate: safe MCP failure](09-release-gate-safe-mcp-failure) | success and safe fail |

## Release evidence

```bash
uv run pytest tests/mcp -q
```
