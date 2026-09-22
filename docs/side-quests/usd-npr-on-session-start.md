---
title: Create a USD to NRS MCP server for Claude Code startup
description: A command hook runs a tiny MCP client at launch and prints the live rate. An mcp_tool hook cannot run until the session is already up.
---

# Create a USD to NRS MCP server for Claude Code startup

When you start Claude Code, a notice shows how many Nepalese rupees one US dollar buys. The model receives the same sentence as session context.

This is optional. [R12](/releases/r12/) builds the shop's MCP server. Leave that server alone. The rate tool is a personal process, same scope as the OpenRouter proxy: your Mac, every project, outside `gold-pasal`.

The counter often writes NRS. The rate feed uses the ISO code NPR. Same currency. The number is a float from a public feed. Leave it out of a Gold Pasal quote. Shop money stays `Decimal`.

## Where the config goes

`~/.claude/settings.json` already points Claude Code at the local OpenRouter proxy (`ANTHROPIC_BASE_URL` on `127.0.0.1:8317`) and the free model ids. The proxy stays up because launchd starts it.

This rate server does not need launchd. Claude Code starts it, talks JSON-RPC on stdin and stdout, and stops it. Logs go to stderr. A `print()` on the server corrupts that stream. The [stdio server lesson](/releases/r12/02-start-and-stop-a-stdio-server) is the same rule.

Two files:

| File | What you put there |
| --- | --- |
| `~/.claude.json` | The server command, via `claude mcp add --scope user` |
| `~/.claude/settings.json` | The SessionStart hooks, next to the OpenRouter `env` block |

## Startup cannot call the MCP tool

An `mcp_tool` hook is the native call: Claude Code invokes a tool on a server you already registered. SessionStart runs before those servers are connected, so Claude Code skips the hook and logs `no MCP client context`. A `startup` matcher is still skipped. The hook runs later, after `/clear` or a compaction.

The notice you see at launch comes from a `command` hook. That hook runs a small client. The client's entire stdout must be one JSON object:

- `systemMessage` is the line on screen
- `hookSpecificOutput.additionalContext` is what the model reads

Plain text on stdout is hidden. Claude may still see it as context. You will not.

## Make the server

The shape is the [Python weather server](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server): `uv`, `MCPServer`, one tool, `mcp.run(transport="stdio")`. Swap the weather calls for one GET.

From a projects folder (not `gold-pasal`):

```bash
uv init npr-rate
cd npr-rate
uv venv
source .venv/bin/activate
uv add "mcp[cli]"
```

Create `rate.py`:

```python
import logging
from typing import Any

import httpx2
from mcp.server import MCPServer

logger = logging.getLogger(__name__)
mcp = MCPServer("npr-rate")
URL = "https://open.er-api.com/v6/latest/USD"


@mcp.tool()
async def usd_to_npr() -> str:
    """Live Nepalese rupees for one US dollar. No arguments."""
    async with httpx2.AsyncClient() as client:
        response = await client.get(URL, timeout=15.0)
        response.raise_for_status()
        data: dict[str, Any] = response.json()
    if data.get("result") != "success" or "NPR" not in data.get("rates", {}):
        logger.warning("rate feed missing NPR")
        return "Rate feed did not return NPR."
    rate = data["rates"]["NPR"]
    updated = data.get("time_last_update_utc", "unknown time")
    return f"1 USD = {rate} NPR (NRS) as of {updated}"


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    mcp.run(transport="stdio")
```

`logging.basicConfig()` writes to stderr. `WARNING` keeps the HTTP client's success line off stderr. If the client crashes, Claude Code shows the first stderr line under `Failed with non-blocking status code`, and that INFO line looks like the cause. Leave stdout for JSON-RPC. The feed needs no API key. `rates.NPR` is the field. The number and the timestamp change through the day.

`uv run rate.py` with no client looks hung. The server is waiting on stdin. Stop it with Ctrl-C.

## Print the notice from a client

Add `print_rate.py` in the same folder. This process may print. The server must not. Print the JSON object only. A rate line before it means stdout does not start with `{`, so Claude Code will not read `systemMessage`.

```python
import asyncio
import json
import shutil

from mcp import Client, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp_types import TextContent

UV = shutil.which("uv")


async def main() -> None:
    if not UV:
        raise SystemExit("uv is not on PATH")
    params = StdioServerParameters(
        command=UV,
        args=["--directory", ".", "run", "rate.py"],
    )
    async with Client(stdio_client(params)) as client:
        result = await client.call_tool("usd_to_npr", {})
        if result.is_error:
            raise SystemExit("usd_to_npr returned an error")
        text = "\n".join(
            block.text
            for block in result.content
            if isinstance(block, TextContent)
        )
        print(json.dumps({
            "systemMessage": text,
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": text,
            },
        }))


if __name__ == "__main__":
    asyncio.run(main())
```

From `npr-rate`:

```bash
uv run print_rate.py
```

```text
{"systemMessage": "1 USD = <number> NPR (NRS) as of <UTC timestamp>", "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "1 USD = <number> NPR (NRS) as of <UTC timestamp>"}}
```

One line, starting with `{` and ending with `}`. If the imports fail, the SDK is older than the [2026-07-28 quickstart](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server). Upgrade with `uv add "mcp[cli]>=2"` and match that page's imports.

## Register the server for every project

```bash
which uv
pwd
```

Use those two absolute paths. From `npr-rate`:

```bash
claude mcp add --scope user --transport stdio npr-rate -- \
  "$(which uv)" --directory "$(pwd)" run rate.py
claude mcp list
```

Approve `npr-rate` when asked. User scope writes `~/.claude.json`. After that, a session can call `usd_to_npr` without the client script. The script is only how startup gets a printed notice.

## Hooks

Open `~/.claude/settings.json`. Keep the existing `env`, `model`, `statusLine`, and `theme` keys. `timeout` is a number. A string is invalid.

```json
"hooks": {
  "SessionStart": [
    {
      "matcher": "startup|resume",
      "hooks": [
        {
          "type": "command",
          "command": "/ABSOLUTE/PATH/FROM/which/uv --directory /ABSOLUTE/PATH/TO/npr-rate run print_rate.py",
          "timeout": 15,
          "statusMessage": "Fetching USD to NRS"
        }
      ]
    },
    {
      "matcher": "clear|compact",
      "hooks": [
        {
          "type": "mcp_tool",
          "server": "npr-rate",
          "tool": "usd_to_npr"
        }
      ]
    }
  ]
}
```

Quit Claude Code and start it again. The startup notice is the `systemMessage` text. Ask what USD to NRS rate was loaded at session start. The answer should match the notice.

`/clear` runs the `mcp_tool` hook. That call does not print `systemMessage`. The tool's own sentence is what comes back, and the screen may stay quiet. The command hook is the one that prints.

Next: the shop server in [R12](/releases/r12/), which searches the catalog and holds stock. This rate tool stays out of that process.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `SessionStart:startup hook error` and `Failed with non-blocking status code`, then an HTTP INFO line | The client exited non-zero. That INFO line is stderr from the GET, not the reason | `import json`, assign `text`, print only the JSON object, exit 0 |
| Session starts with no notice | The only hook is `mcp_tool`, or the matcher is `clear\|compact` | `command` hook with matcher `startup\|resume` |
| The model knows the rate, you never saw it | stdout was the rate sentence, not hook JSON | Print the `systemMessage` object and nothing before it |
| `uv: command not found` from the hook | Claude's PATH lacks `~/.local/bin` | Absolute path from `which uv` in the hook and in `claude mcp add` |
| `Rate feed did not return NPR` | The GET failed or the JSON shape changed | Open `https://open.er-api.com/v6/latest/USD` and check `rates.NPR` |
| `claude mcp list` has no `npr-rate` | Server was added for one folder only | Re-run `claude mcp add --scope user` |
