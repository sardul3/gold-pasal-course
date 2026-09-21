---
id: r12-08
title: "Inspector and contract tests"
release: r12
order: 8
prerequisites: [r12-07]
outcomes:
  - Commit JSON-RPC request/response fixtures
  - Use Inspector locally to sanity-check
evidence: [ci-run]
---

<LessonMission
  role="MCP integrator"
  problem="It works in Inspector once. CI cannot click Inspector."
  destination="Contract fixtures for initialize, list, call, and invalid call. Inspector is a demo, not the gate."
/>

# Inspector and contract tests

**MCP Inspector** is a GUI that spawns your command. Use it on the laptop. **Contract tests** send the same JSON the Inspector would. Pin fixtures in `tests/mcp/fixtures/`.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/mcp -q
```

```text
... passed
```

Add Inspector only as a documented command in docs/mcp.md.

## Fixtures

Store initialize request, initialize result, tools/list result (names only change when you mean to). A CI job fails if you rename catalog_search without updating the fixture.

Inspector: `npx @modelcontextprotocol/inspector uv run gold-pasal-mcp` (pin versions in the doc). If npx is unavailable, skip Inspector and rely on tests; say so in the evidence card.

Remote MCP stays a side quest.

## Fixture hygiene

Do not store a full catalog dump in the tools/call result fixture. One ring JSON is enough. Large fixtures hide contract changes. When you add create_hold, add a second fixture rather than expanding search until it is unreadable.

## initialize

The initialize result must advertise tools capability if you have tools. A mismatch (capabilities.tools missing but tools/list works) confuses some clients. Snapshot that initialize payload in fixtures so a SDK upgrade cannot silently drop it.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| CI requires Inspector | GUI in Actions | JSON fixtures only |
| fixture drift | renamed tool | Update both |

## Practice

<LessonQuiz
  question="What is the merge gate for MCP?"
  a="A screenshot of Inspector"
  b="Automated JSON-RPC contract tests"
  c="A homelab Argo sync"
  d="A paid OpenAI call"
  correct="b"
>

Inspector is local evidence. CI is fixtures.

</LessonQuiz>

Next: [Release gate: safe MCP failure](09-release-gate-safe-mcp-failure).

<EvidenceCard
  command="uv run pytest tests/mcp -q"
  artifact="fixtures plus optional Inspector note"
  invariant="Protocol changes are fixture changes."
/>
