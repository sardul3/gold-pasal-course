---
id: r12-09
title: "Release gate: safe MCP failure"
release: r12
order: 9
prerequisites: [r12-08]
outcomes:
  - Connect a client
  - Demonstrate safe failure paths
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="MCP integrator"
  problem="A reviewer connects a client. You need a successful search and a failed hold without confirmation, both clean."
  destination="Inspector or a scripted client: list tools, search, invalid args error, hold without confirm does not POST."
/>

# Release gate: safe MCP failure

This is the release gate. Show tools/list, a catalog_search result that matches the API, an invalid call error with no traceback, and create_hold without confirm that does not create a hold row.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/mcp -q
```

```text
... passed
```

Tests green, then the live client.

## Demo

1. Start the API
2. Start Inspector or a small JSON-RPC client
3. catalog_search karat=22
4. catalog_search karat="hot"
5. create_hold without confirm
6. Database hold count unchanged

R13 will point these tools at a mock customer system as well. The protocol stays the same.

## Client mixed up

If Inspector shows a hold that tests say cannot exist, you are pointed at a different API or an old process. Kill stray `gold-pasal-mcp` processes. Confirm `GOLD_PASAL_BASE_URL`. Re-run pytest. Then demo again.

## Count holds

`SELECT count(*) FROM holds` or the list API before and after the unconfirmed create_hold. Same number. Then confirm (if you demo the happy path) and the count increases by one. That is the same R11 proof, now through JSON-RPC.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| hold created in step 5 | policy fail | Fix before claiming the gate |
| traceback in step 4 | error mapping fail | Map it |

## Practice

<LessonQuiz
  question="What must stay true when MCP is added?"
  a="A second hold table"
  b="API invariants and confirmation policy"
  c="Root filesystem tools"
  d="Paid APIs in CI"
  correct="b"
>

MCP is another client of the same shop.

</LessonQuiz>

<EvidenceCard
  command="uv run pytest tests/mcp -q"
  artifact="client transcript plus pytest"
  invariant="MCP failures are typed and non-leaking."
/>
