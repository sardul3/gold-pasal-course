---
id: r12-03
title: "Advertise capabilities and list typed tools"
release: r12
order: 3
prerequisites: [r12-02]
outcomes:
  - Apply advertise capabilities and list typed tools to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Advertise capabilities and list typed tools


An MCP client should not guess what Gold Pasal can do. It learns by initialization and discovery.

## See the idea first

A capability says which MCP feature families the server supports. Tool discovery then returns each tool’s name, description, and JSON Schema (a machine-readable description of valid JSON). Advertising a capability without implementing it is a broken contract.

Gold Pasal needs exactly three tools:

- `catalog_search`: read-only search with a non-empty query and a bounded result limit.
- `get_order_status`: read-only lookup using the public order identifier.
- `create_hold`: a state-changing request with item, quantity, explicit confirmation, and idempotency key.

Types reduce ambiguity. If `limit` is an integer from 1 through 50, say that in the schema. Reject unknown fields so a misspelled `confirmed` does not silently become an unconfirmed or differently interpreted action. Descriptions should state side effects and confirmation policy; they should not contain business logic the API alone enforces.

The check in `checks/r12/test_mcp_contract.py` establishes the minimum discovery contract: all three narrow tools exist, while `shell` and `sql` do not. Absence is a security property. A convenient generic tool would bypass the reviewed Gold Pasal API surface.

<FailureWorkbench incident="A client sends limit=10000 because discovery did not communicate a bound." :hypotheses="['schema omits maximum', 'server trusts client discovery', 'API adapter skipped validation']" next-evidence="The call is rejected before HTTP and the fixture confirms no API request occurred." />

## Worked schema reasoning

For `catalog_search`, `query=""` fails because empty text cannot identify catalog intent. `limit=10_000` fails because it violates the bounded-read policy. Both are knowable before an HTTP call. For `create_hold`, `confirmed=false` may be valid JSON but must not perform the write; confirmation policy is stronger than schema validity.

## Practice

Write a table with one row per tool: side effect, required fields, bounds, API endpoint, and safe failure. Then inspect `tools/list` and compare the actual schemas with your table.

<PredictThenRun prompt="Which tool names and schema constraints must discovery expose, and which powerful names must be absent?" />

The discoverable set is `catalog_search`, `get_order_status`, and `create_hold`; `shell` and `sql` remain absent. The catalog schema rejects empty queries and excessive limits before HTTP.

Version schema changes like API changes. Making a required field optional can alter safety even when old clients still parse the response.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Save the discovered tool names and one schema snapshot. This supports Behavior and Tests in the evidence rubric; it does not prove authorization.

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
