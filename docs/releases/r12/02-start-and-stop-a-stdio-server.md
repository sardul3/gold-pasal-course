---
id: r12-02
title: "Start and stop a stdio server"
release: r12
order: 2
prerequisites: [r12-01]
outcomes:
  - Add a console script that runs the stdio loop
  - Exit 0 on clean shutdown
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP integrator"
  problem="The server is a long-lived HTTP process. MCP Inspector instead expects stdin/stdout JSON-RPC."
  destination="`uv run gold-pasal-mcp` reads stdin and writes stdout. SIGTERM exits cleanly."
/>

# Start and stop a stdio server

**stdio** means the client spawns your process and talks on pipes. Logging must go to stderr, not stdout, or you will corrupt JSON-RPC. Use the official MCP Python SDK if the shop lockfile allows it, or a small loop; pick one and stay.

## See the idea first

From `gold-pasal`:

```bash
grep -n scripts pyproject.toml | head
```

```text
[project.scripts]
gold-pasal = gold_pasal.cli:main
```

Add `gold-pasal-mcp = gold_pasal.mcp.server:main`.

## Process

```python
def main() -> None:
    logging.basicConfig(stream=sys.stderr)
    run_stdio_server()
```

Tests: spawn the process, send initialize, assert a JSON-RPC response, terminate.

Do not print hello to stdout. Do not use the same port as uvicorn. The API is a separate process the server calls over HTTP (or ASGI in tests).

## Environment

The MCP process needs `GOLD_PASAL_BASE_URL` pointing at the API and the staff token. It does not start uvicorn itself. Document the two-process model in `--help` or the README. Tests can point `GOLD_PASAL_BASE_URL` at ASGI via httpx, or use respx.

## Framing

MCP Inspector and Cursor both spawn this command. If your `main()` blocks on a web server bind, those clients hang. The process must be a stdio loop. uvicorn stays next door. Two processes, one shop.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Inspector hangs | log on stdout | stderr only |
| zombie process | no signal handling | close the loop on SIGTERM |

## Practice

<LessonQuiz
  question="Where do logs go on an MCP stdio server?"
  a="stdout"
  b="stderr"
  c="/health"
  d="GHCR"
  correct="b"
>

stdout is the RPC stream.

</LessonQuiz>

Next: [Typed tools and catalog search](03-typed-tools-and-catalog-search).

<EvidenceCard
  command="uv run gold-pasal-mcp --help || true"
  artifact="console script and a spawn test"
  invariant="stdout is JSON-RPC only."
/>
