---
id: r12-06
title: "Validate every tool argument in the harness"
release: r12
order: 6
prerequisites: [r12-05]
outcomes:
  - Apply validate every tool argument in the harness to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Validate every tool argument in the harness


Tool descriptions help a model choose arguments. They do not enforce safety. The harness—the deterministic code between the model and the tool implementation—must enforce it.

## See the idea first

Schema validation checks shape and basic constraints: required fields, types, ranges, formats, enums, and unknown fields. Policy validation checks authority: allowed customer, confirmation state, root, environment, and side-effect permission. Domain validation remains in the Gold Pasal API: stock availability, legal state transitions, and hold conflicts.

For `catalog_search`, reject blank text and a limit outside the advertised range. For `get_order_status`, reject a missing or malformed public order ID. For `create_hold`, reject non-positive quantity, unknown fields, malformed idempotency keys, and any attempt to bypass confirmation.

Validation order matters:

1. Parse the MCP request.
2. Match a known tool.
3. Validate the full input schema with unknown fields forbidden.
4. Enforce identity, confirmation, and environment policy.
5. Only then construct an HTTP request.
6. Let the API enforce current domain state.

The release check calls `catalog_search` with an empty query and `limit=10_000` and expects `isError` to be true. Strengthen it with a recording HTTP fixture and assert zero requests. An error after a network call is too late for the harness invariant.

<FailureWorkbench incident="An invalid purity value reaches the API." :hypotheses="['schema accepts arbitrary strings', 'unknown fields are ignored', 'handler calls HTTP before validation']" next-evidence="The public tool result is an error and the recording transport has zero requests." />

## Practice

Build a boundary table for all three tools. Include empty strings, boundary numbers, one-above-maximum, wrong types, extra keys, unauthorized identity, and a valid request that the API rejects for domain state.

<PredictThenRun prompt="Which cases must fail before HTTP, and which valid case must be decided by the Gold Pasal API?" />

Malformed and unauthorized calls fail before HTTP. A well-formed confirmed hold for unavailable stock reaches the API and returns a domain conflict.

## Worked reasoning

Putting every rule in JSON Schema is tempting, but stock availability changes and belongs to the API. Putting every rule in a prompt is unsafe because model behavior is probabilistic. The harness owns deterministic call policy; the API owns business truth.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Store the invalid-call transcript and zero-HTTP assertion as evidence. This directly supports the rubric’s risky-boundary test score.

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
