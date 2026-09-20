---
id: r12-08
title: "Return useful protocol errors without exposing internals"
release: r12
order: 8
prerequisites: [r12-07]
outcomes:
  - Apply return useful protocol errors without exposing internals to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Return useful protocol errors without exposing internals


Useful errors tell the client what category failed and whether retrying makes sense. Safe errors do not reveal stack traces, credentials, SQL, internal URLs, or another shopper’s order.

## See the idea first

A **protocol error** means the message could not be processed as requested: malformed JSON-RPC, unknown method, unknown tool, or invalid arguments. A **domain error** means the request was structurally valid but Gold Pasal could not fulfill it: order not found, hold conflict, insufficient stock, or confirmation required.

A dependency timeout is neither an invalid argument nor an inventory conflict. Classify it as an unavailable dependency, include retry guidance only when safe, and attach an opaque correlation ID that operators can match to redacted logs.

Example client-facing shapes should distinguish:

- `INVALID_ARGUMENT`: identify the field and constraint, no HTTP attempted.
- `CONFIRMATION_REQUIRED`: present the pending hold summary, no write attempted.
- `HOLD_CONFLICT`: valid confirmed request, API rejected current domain state.
- `DEPENDENCY_UNAVAILABLE`: bounded API call failed, retry status stated.
- `INTERNAL_ERROR`: opaque message plus correlation ID; details only in protected logs.

Do not convert every failure to “tool failed.” The client cannot decide whether to fix arguments, seek approval, retry, or stop. Also do not pass through raw API bodies; they can expose implementation details and make the MCP contract unstable.

<FailureWorkbench incident="A failed get_order_status reveals an internal API URL and traceback." :hypotheses="['raw exception was serialized', 'API error body was passed through', 'logging and client errors share a formatter']" next-evidence="Client sees a stable code and correlation ID; protected log contains redacted diagnostic context." />

## Practice

Send one malformed request, one valid unavailable-item hold, and one simulated timeout. For each, record layer, client code, retry advice, HTTP call count, and log fields.

<PredictThenRun prompt="How should invalid arguments, a hold conflict, and an API timeout differ to the client and operator?" />

Invalid arguments identify the bad field and never call HTTP. The hold conflict preserves the safe domain reason. The timeout says the dependency is unavailable and supplies a correlation ID; only the operator log has diagnostic detail.

Assert both shape and absence: no traceback, token, filesystem path, SQL, or private order detail. Negative assertions are part of the contract.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Preserve the three safe failure fixtures as durable evidence. Explain that fixture coverage proves mapping behavior, not the absence of every possible secret.

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
