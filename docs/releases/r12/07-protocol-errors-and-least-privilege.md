---
id: r12-07
title: "Protocol errors and least privilege"
release: r12
order: 7
prerequisites: [r12-06]
outcomes:
  - Map 4xx/5xx to stable MCP errors
  - Document that the server holds staff credentials
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP integrator"
  problem="A 500 from the API is forwarded as a Python traceback into the client."
  destination="Mapped JSON-RPC errors, no internals. Roots and logging stay narrow."
/>

# Protocol errors and least privilege

**Least privilege**: the MCP process gets a staff token in its environment, not a cluster admin kubeconfig, not the database password if HTTP is enough. **Roots** (filesystem) should be empty or a data dir you intend. Do not advertise a generic `read_file` tool.

## See the idea first

From `gold-pasal`:

```bash
ls src/gold_pasal/mcp
```

```text
...
```

Add error mapping tests: 404 catalog, 409 hold, 503 ready.

## Mapping

404 -> application error "not found" with the problem title, not the SQL.
409 -> conflict, include problem type.
Network timeout -> JSON-RPC internal with a public message "catalog unavailable".

Logs on stderr with request id if the API returned `x-request-id`. Do not log tokens.

If you support MCP roots, allowlist a directory that is not `/`. Default: no fs tools.

## Roots

MCP roots tell the server which filesystem paths the user allowed. This shop should not read customer home directories. If the SDK requires a roots handler, return an empty list or a dedicated `./var/mcp` directory that you created on purpose.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| stack in Inspector | str(exc) forwarded | Map explicitly |
| DATABASE_URL in the MCP env unused | extra privilege | Remove it if unused |

## Practice

<LessonQuiz
  question="Which tool should this server not advertise?"
  a="catalog_search"
  b="unrestricted read_file on /"
  c="create_hold with confirm"
  d="order status"
  correct="b"
>

Least privilege. The shop is an API, not a filesystem.

</LessonQuiz>

Next: [Inspector and contract tests](08-inspector-and-contract-tests).

<EvidenceCard
  command="uv run pytest tests/mcp/test_errors.py -q"
  artifact="error map and a privilege note in docs/mcp.md"
  invariant="Protocol errors are public; internals stay off the wire."
/>
