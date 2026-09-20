---
id: r12-01
title: "Understand JSON-RPC and MCP client/server responsibilities"
release: r12
order: 1
prerequisites: []
outcomes:
  - Apply understand json-rpc and mcp client/server responsibilities to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Understand JSON-RPC and MCP client/server responsibilities


The Gold Pasal API already knows how to search jewelry, report an order, and create an inventory hold. Your new problem is narrower: let an MCP client request those behaviors without giving it SQL, shell, or database credentials.

## See the idea first

JSON-RPC is an envelope for asking a named method to do work. A request carries `jsonrpc: "2.0"`, an `id`, a `method`, and optional `params`. The response repeats the same `id` and contains either `result` or `error`. The matching ID matters because a client may have several requests in flight.

For example, `tools/list` is a protocol request. The client does not invent the available tools; it asks the server. Later, `tools/call` names `catalog_search` and supplies arguments. JSON-RPC explains the envelope. MCP defines the methods, lifecycle, and shapes carried inside it.

The **client** starts or connects to the server, negotiates capabilities, discovers tools, and chooses when to call one. The **server** advertises only supported capabilities, validates each call, delegates to the existing Gold Pasal HTTP API, and returns MCP content. The API remains the owner of catalog, order, and hold business rules.

Keep this boundary explicit:

```text
shopper intent -> MCP client -> JSON-RPC/MCP -> Gold Pasal MCP server
                                             -> existing HTTP API -> database
```

The MCP server is an adapter, not a second storefront service. If it recalculates purity eligibility or inventory availability, two implementations can disagree.

<FailureWorkbench incident="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="tools/list advertises catalog_search; an invalid purity argument is rejected before any HTTP request leaves the server." />

## Reason about two failures

Suppose a client calls `catalog_search` with `{"query": "", "limit": 10000}`. That is invalid at the tool boundary. The server should reject it before making HTTP traffic. By contrast, a valid `create_hold` request can reach the API and fail because the item is unavailable. The first is a protocol-facing argument failure; the second is a domain outcome.

Worked reasoning:

1. Can the server understand and validate the request shape? If no, return a safe MCP/JSON-RPC error.
2. Was the request valid but refused by Gold Pasal policy or state? If yes, return a typed domain failure in the tool result.
3. Did an unexpected dependency fail? Log a correlation ID server-side and return a non-sensitive failure. Never expose a traceback, token, or database detail.

## Practice

Draw the five boxes above. For `catalog_search(query="22k ring")`, label the data at every arrow and name who validates it. Then do the same for an unknown JSON-RPC method.

<PredictThenRun prompt="Which request ID, result shape, and failure boundary should the client observe?" />

The search arguments should be checked by the MCP tool schema, translated to the existing API contract, and returned as structured tool content. An unknown method never reaches the Gold Pasal API; JSON-RPC reports that the method is unsupported while preserving the request ID.

Do not write solved server code here. Write the contract test first at the public `ClientSession` seam. Helpers are not proof that a real client can initialize or call a tool.

The release invariant is **protocol handlers validate and authorize but never duplicate business rules**.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

The provided check proves a real stdio client can initialize and discover the narrow tool set. It does not yet prove hold idempotency or production authorization. Record the command, exit status, and one observed tool name in the Portfolio Ledger; that moves the work from Read toward Practiced in the evidence rubric.

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
