---
id: r12-01
title: "JSON-RPC and MCP"
release: r12
order: 1
prerequisites: []
outcomes:
  - Name id, method, params, and error in JSON-RPC
  - Place MCP client vs server responsibilities
evidence: [commit]
---

<LessonMission
  role="MCP integrator"
  problem="A client wants Gold Pasal tools inside an editor. Raw HTTP OpenAPI is not what that client speaks."
  destination="You can explain JSON-RPC request/response/error and that MCP is a typed tool/resource protocol on top."
/>

# JSON-RPC and MCP

**JSON-RPC** is a JSON request with `method` and `id`, and a response with `result` or `error`. **MCP** (Model Context Protocol) uses that for `initialize`, `tools/list`, `tools/call`. The **server** (you) exposes tools. The **client** (Claude Desktop, Inspector, Cursor) calls them. Business rules stay in the Gold Pasal API. The server is a harness.

## See the idea first

From `gold-pasal`:

```bash
python -c 'import json; print(json.dumps({"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}))'
```

```text
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
```

That is a request shape, not a running server yet.

## Split

Client: starts the process, sends initialize, lists tools, calls tools, renders results.

Server: declares capabilities, validates arguments, calls HTTP, returns text or structured content, maps failures to protocol errors.

The server does not embed a model. It does not open a shell. Remote HTTP MCP and OAuth wait for the [remote MCP side quest](/side-quests/). This release is stdio only.

## Notifications

JSON-RPC also has notifications (no id). MCP uses requests for tools/call. If you implement a custom loop, do not drop `id` on responses or the client cannot match errors to calls. Write `docs/mcp.md` with that one-liner plus client vs server.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| building an HTTP MCP first | scope | stdio for the gate |
| copying hold SQL into the server | duplicate domain | HTTP to the API |

## Practice

<LessonQuiz
  question="Who validates tool arguments?"
  a="The model vendor"
  b="The MCP server harness, then the API"
  c="PostgreSQL CHECK only"
  d="kind Ingress"
  correct="b"
>

Protocol first, then your existing validation.

</LessonQuiz>

Next: [Start and stop a stdio server](02-start-and-stop-a-stdio-server).

<EvidenceCard
  command="python3 -c 'import json; json.loads(chr(123)+chr(125))'"
  artifact="notes in docs/mcp.md: client vs server"
  invariant="MCP is a protocol adapter, not a second shop."
/>
