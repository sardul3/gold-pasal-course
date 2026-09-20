---
id: r12-05
title: "Add order-status resources and curated prompts where they fit"
release: r12
order: 5
prerequisites: [r12-04]
outcomes:
  - Apply add order-status resources and curated prompts where they fit to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Add order-status resources and curated prompts where they fit


MCP offers tools, resources, and prompts. They are not three names for the same thing.

## See the idea first

A **tool** performs a parameterized operation. `get_order_status(order_id)` fits because the caller supplies an identifier and authorization is checked for every call.

A **resource** is readable context identified by a URI. A safe example is a non-sensitive order-status glossary explaining `PENDING`, `CONFIRMED`, and `FULFILLED`. A customer’s live order is usually a poor static resource unless the resource read can enforce the same per-order authorization and freshness as the API.

A **prompt** is a reusable conversation template selected by the user. “Explain this order status and suggest the next safe action” can be a prompt. A prompt must not secretly create a hold or grant access; it guides language, while tools and the harness enforce permissions.

Use this decision test:

- Does it act or fetch private changing state with parameters? Use a tool.
- Is it safe, addressable context that a host may read? Consider a resource.
- Is it user-invoked guidance for composing a conversation? Consider a prompt.
- Does none of these improve the Gold Pasal task? Do not expose it.

<FailureWorkbench incident="A resource URI lets one shopper read another shopper's order." :hypotheses="['resource read skipped authorization', 'URI contains guessable IDs', 'cache ignored identity']" next-evidence="Cross-user fixture is denied and logs contain no order details." />

## Worked reasoning

`get_order_status` should accept a public order ID, call the existing authenticated API, and return the status plus safe timestamps. “Order not found” and “not authorized” should not reveal whether another customer owns that ID. The status glossary can be a resource because it is shared documentation. The explanation prompt can reference the glossary and ask the model to cite the returned status, but it cannot claim a refund or hold was created.

## Practice

Classify these as tool, resource, prompt, or omit: live order lookup; status glossary; “explain my delayed order”; raw database schema; create hold. Give one sentence of boundary reasoning for each.

<PredictThenRun prompt="Which MCP primitive fits each artifact without weakening authorization or implying a side effect?" />

The live lookup and hold are tools, the glossary is a resource, the explanation is a prompt, and the raw schema is omitted. The distinction is based on behavior and authority, not on which API is easiest to implement.

Test one authorized lookup, one cross-user denial, and prompt/resource discovery. Do not test only that names appear.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Record why each primitive was selected. That design explanation can become ADR evidence if the public surface is hard to reverse.

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
