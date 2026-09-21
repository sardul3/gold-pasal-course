---
id: r12-06
title: "Idempotent hold with confirmation"
release: r12
order: 6
prerequisites: [r12-05]
outcomes:
  - Expose hold creation with an explicit confirmation policy
  - Pass Idempotency-Key through to the API
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP integrator"
  problem="The MCP client can call create_hold in a loop and oversell if you skip R11's confirmation."
  destination="create_hold is preview or requires a confirmation flag policy you document; HTTP uses Idempotency-Key."
/>

# Idempotent hold with confirmation

State-changing MCP tools need the same **confirmation policy** as the agent. Options: (1) tool only previews, staff confirms in the API UI; (2) tool requires `confirm: true` AND the MCP server is bound to staff credentials you accept. Document the choice in docs/mcp.md. Always send Idempotency-Key so retries do not double-hold.

## See the idea first

From `gold-pasal`:

```bash
rg Idempotency src/gold_pasal | head
```

```text
...
```

R5 already implements the header. The MCP server must set it.

## Policy pick

This course picks: `create_hold` requires `confirm` boolean true in arguments, plus a server-side allowlist that this tool is enabled. Without confirm, return a preview payload and no POST. Tests cover both.

Idempotency key: `mcp-{client_id}-{hash of sku+request id}` or a client-supplied key you validate as a token.

Do not take confirmation from catalog text.

## Client-supplied keys

If the MCP client sends `idempotency_key`, validate it as a 8-64 character token. Do not accept an empty string. If they omit it, the server may mint one and return it in the result so retries can reuse it. Document which policy you picked.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| POST without confirm | policy missing | Gate in harness |
| two holds on retry | missing key | Set the header |

## Practice

<LessonQuiz
  question="What prevents a double hold on retry?"
  a="The model remembering"
  b="Idempotency-Key on POST /api/holds"
  c="kind rollback"
  d="Trivy"
  correct="b"
>

R5 already solved retries. MCP must not undo that.

</LessonQuiz>

Next: [Protocol errors and least privilege](07-protocol-errors-and-least-privilege).

<EvidenceCard
  command="uv run pytest tests/mcp/test_hold.py -q"
  artifact="preview vs confirm tests plus idempotency"
  invariant="MCP cannot bypass store hold rules."
/>
