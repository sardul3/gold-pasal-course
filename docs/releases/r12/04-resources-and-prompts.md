---
id: r12-04
title: "Resources and prompts"
release: r12
order: 4
prerequisites: [r12-03]
outcomes:
  - Expose a resource template for order status
  - Add one prompt that uses catalog_search
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP integrator"
  problem="The client keeps pasting order UUIDs. MCP resources and a curated prompt would help, but only if they fit."
  destination="An order-status resource URI and one curated prompt that does not grant extra tools."
/>

# Resources and prompts

**Resources** are readable URIs (`goldpasal://orders/{id}`). **Prompts** are named templates the client can insert. Skip either if you have nothing useful. Do not expose the whole database as resources.

## See the idea first

From `gold-pasal`:

```bash
ls src/gold_pasal/mcp
```

```text
server.py ...
```

Add resources.py and prompts.py only if they stay thin.

## Fit test

Resource: GET order as JSON, staff token from server Settings (the MCP process is already a privileged staff integration; document that). If that is too much privilege, skip resources and document why in docs/mcp.md.

Prompt: "Ask whether a SKU is in catalog; use catalog_search; do not invent karat."

No prompt may tell the client to skip confirmation on holds.

## If you skip resources

Write one paragraph in docs/mcp.md: order JSON is already GET /api/orders; exposing it as a resource would duplicate the staff token in a second URI scheme. Skipping is a valid FDE choice. The gate does not require resources.

## Prompt arguments

If the prompt takes a SKU argument, schema-validate it the same way as tools. A prompt that interpolates raw user text into "ignore previous" instructions is an injection hole. Keep the template boring.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| resource dumps .env | over-exposure | Only order JSON |
| prompt says you are confirmed | policy leak | Delete that sentence |

## Practice

<LessonQuiz
  question="When do you skip MCP resources?"
  a="Never"
  b="When they would only duplicate tools or leak"
  c="When using Ollama"
  d="When using kind"
  correct="b"
>

MCP features are optional. Least privilege wins.

</LessonQuiz>

Next: [Validate tool arguments](05-validate-tool-arguments).

<EvidenceCard
  command="uv run pytest tests/mcp/test_resources.py -q"
  artifact="optional resource plus one prompt, or a written skip"
  invariant="Resources do not widen authority past the API roles you already have."
/>
