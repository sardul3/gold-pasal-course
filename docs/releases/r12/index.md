---
title: "R12 — Gold Pasal over MCP"
description: "A least-privilege MCP server backed by the existing application API."
---

# R12 — Gold Pasal over MCP

**Release promise:** A least-privilege MCP server backed by the existing application API.

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

## Lessons

1. [Understand JSON-RPC and MCP client/server responsibilities](01-understand-json-rpc-and-mcp-client-server-responsibilities)
2. [Start and stop a stdio MCP server correctly](02-start-and-stop-a-stdio-mcp-server-correctly)
3. [Advertise capabilities and list typed tools](03-advertise-capabilities-and-list-typed-tools)
4. [Expose read-only catalog search through the existing API](04-expose-read-only-catalog-search-through-the-existing-api)
5. [Add order-status resources and curated prompts where they fit](05-add-order-status-resources-and-curated-prompts-where-they-fit)
6. [Validate every tool argument in the harness](06-validate-every-tool-argument-in-the-harness)
7. [Add idempotent hold creation with explicit confirmation policy](07-add-idempotent-hold-creation-with-explicit-confirmation-policy)
8. [Return useful protocol errors without exposing internals](08-return-useful-protocol-errors-without-exposing-internals)
9. [Test with MCP Inspector and automated contract fixtures](09-test-with-mcp-inspector-and-automated-contract-fixtures)
10. [Apply roots, authorization, logging, and least privilege](10-apply-roots-authorization-logging-and-least-privilege)
11. [Release gate: connect a client and demonstrate safe failure paths](11-release-gate-connect-a-client-and-demonstrate-safe-failure-paths)

## Release evidence

Run `uv run pytest tests/mcp -q` and preserve Inspector evidence, protocol fixtures, and a safe failure transcript. At the review, defend this
invariant: **protocol handlers validate and authorize but never duplicate business rules.**

<ArchitectureTrail
  before="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>
