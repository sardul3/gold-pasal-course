---
id: r12-05
title: "Validate tool arguments"
release: r12
order: 5
prerequisites: [r12-04]
outcomes:
  - Validate every tools/call against the advertised schema
  - Return a protocol error on mismatch
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP integrator"
  problem="tools/call passes karat as the string twenty two, the HTTP client runs, and a traceback hits the Inspector."
  destination="JSON Schema validation in the harness rejects bad args before HTTP."
/>

# Validate tool arguments

The SDK may validate; do not assume. Parse arguments with Pydantic models that match the schema. On failure, JSON-RPC error with a safe message. No traceback.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/mcp -q | tail -1
```

```text
... passed
```

Add a test that sends karat as a string.

## Test

`tools/call` name catalog_search, arguments `{"karat": "22k"}`. Expect error, zero HTTP requests (respx empty).

Do not extra-validate business rules the API already enforces, except types and required fields. Duplicate purity rules will drift.

This is the same idea as R11's harness, at the protocol edge.

## additionalProperties

If the schema omits `additionalProperties: false`, a model can send `confirm: true` on catalog_search and you might ignore it today and honor it tomorrow. Fail extra keys. Tests should include one extra key.

## Error code

Use a stable JSON-RPC code (invalid params) and a short message: "karat must be an integer." Do not include the Pydantic traceback. Clients display `message`. Internals belong in stderr logs with a correlation id.

Required fields: if `karat` is optional, omitting it is valid. If you later add `sku` as required on a get_item tool, missing `sku` is invalid params, not an HTTP 404. Keep that distinction so clients can fix the call without thinking the shop is down.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| HTTP called with bad types | skipped schema | Validate first |
| traceback in error.data | leaked internals | Stable error code |

## Practice

<LessonQuiz
  question="When is HTTP allowed for catalog_search?"
  a="Always"
  b="After schema validation succeeds"
  c="After the model says please"
  d="After kind smoke"
  correct="b"
>

Harness first.

</LessonQuiz>

Next: [Idempotent hold with confirmation](06-idempotent-hold-with-confirmation).

<EvidenceCard
  command="uv run pytest tests/mcp/test_validate.py -q"
  artifact="invalid karat fixture with zero HTTP"
  invariant="Invalid args never leave the server."
/>
