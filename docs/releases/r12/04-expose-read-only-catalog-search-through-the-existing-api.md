---
id: r12-04
title: "Expose read-only catalog search through the existing API"
release: r12
order: 4
prerequisites: [r12-03]
outcomes:
  - Apply expose read-only catalog search through the existing api to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Expose read-only catalog search through the existing API


The first useful tool is deliberately read-only. A shopper can ask for “22k ring” without granting the MCP process direct catalog storage access.

## See the idea first

`catalog_search` is an adapter around the existing Gold Pasal HTTP API. An adapter translates one public contract into another. It validates MCP arguments, sends the API’s documented query, and maps the documented response to compact structured content.

Do not query catalog tables, recalculate price, or duplicate purity filters in the MCP package. The API remains the authoritative boundary, so web clients and MCP clients see the same inventory rules.

A typical trace is:

```text
{query: "22k ring", limit: 5}
-> schema validation
-> authenticated GET to the catalog API
-> documented product summaries
-> structured MCP result with stable product IDs
```

The result should contain only fields a client needs, such as product ID, display name, purity, price display, and availability summary. Do not return ORM objects, internal supplier notes, or an unbounded API body.

<FailureWorkbench incident="catalog_search returns different availability than the storefront." :hypotheses="['MCP duplicated a filter', 'fixture is stale', 'API response mapping dropped state']" next-evidence="Recorded HTTP request and fixture show the MCP result derives from the existing API response." />

## Worked reasoning

For an empty query, there is no reason to spend network time: reject at the tool schema. For a valid query with no matches, return a successful empty result, not an error. For an API timeout, return a safe dependency failure and correlation ID; do not invent products or retry without a finite policy.

## Practice

Create fixtures for one match, no matches, and an API timeout. Before running them, write the expected `isError` value and whether an HTTP request should exist.

<PredictThenRun prompt="For invalid input, zero matches, and timeout, which cases call HTTP and which are errors?" />

Invalid input makes zero HTTP calls and is an error. Zero matches makes one HTTP call and is a successful empty result. Timeout makes one bounded call and is a safe error.

Test through `ClientSession.call_tool`; also assert the fixture received the expected API path and bounded query. That proves translation without coupling the test to helper functions.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Add the fixture transcript and API contract reference to the Portfolio Ledger. Be explicit that fixture-backed behavior is not a live production availability guarantee.

<EvidenceCard
  command="uv run pytest tests/mcp -q"
  artifact="Inspector evidence, protocol fixtures, and a safe failure transcript"
  invariant="protocol handlers validate and authorize but never duplicate business rules"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="Inspector evidence, protocol fixtures, and a safe failure transcript"
  interview-question="Where do MCP protocol, authorization, and business validation boundaries belong?"
/>
