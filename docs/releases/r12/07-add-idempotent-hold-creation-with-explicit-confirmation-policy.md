---
id: r12-07
title: "Add idempotent hold creation with explicit confirmation policy"
release: r12
order: 7
prerequisites: [r12-06]
outcomes:
  - Apply add idempotent hold creation with explicit confirmation policy to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Add idempotent hold creation with explicit confirmation policy


Creating a hold changes inventory availability. A model suggesting a hold is not permission to create one.

## See the idea first

The harness should represent confirmation as state, not as polite prompt text. Before confirmation, it may return a summary such as product, quantity, expiry policy, and idempotency key with `awaiting_confirmation`. Only a fresh, explicit approval for that exact action allows the API call.

**Idempotency** means repeating the same intended write does not apply it twice. The client supplies a stable idempotency key, and the existing API stores or recognizes it. A retry with the same key and same payload returns the original hold. Reusing the key with a different product or quantity is a conflict, not a new hold.

Worked sequence:

1. `create_hold` receives product `GP-RING-22K-01`, quantity `1`, and key `demo-hold-001`.
2. Without explicit confirmation, the harness makes zero write requests.
3. The user confirms the exact summary.
4. The harness sends one authenticated API request with the same key.
5. A transport retry repeats that request; the API returns the same hold ID.

Confirmation and idempotency solve different risks. Confirmation prevents an unapproved write. Idempotency prevents duplicate application after an approved write.

<FailureWorkbench incident="The client times out after the API commits a hold and retries." :hypotheses="['idempotency key changed', 'API did not persist the first result', 'harness generated keys per attempt']" next-evidence="Two identical calls yield one hold ID and one inventory effect." />

## Practice

Design four fixtures: no confirmation, confirmed first call, identical retry, and same key with changed quantity. Predict API call count, `isError`, and hold ID.

<PredictThenRun prompt="Which fixture creates a hold, which returns the same hold, and which must fail closed?" />

No confirmation creates nothing. The confirmed call creates one hold. Its identical retry returns the same hold. Changed intent with the same key fails as a conflict.

## Worked reasoning

Do not generate a new key inside each retry; that converts one intent into multiple writes. Do not infer confirmation from “yes” without binding it to the pending product, quantity, customer, and expiry. Clear pending approval after execution or material input changes.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Add the four-case result table to the Portfolio Ledger. To claim Proven, attach the public-seam fixture and one API or database invariant showing a single inventory effect.

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
