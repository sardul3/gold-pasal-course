---
id: r12-09
title: "Test with MCP Inspector and automated contract fixtures"
release: r12
order: 9
prerequisites: [r12-08]
outcomes:
  - Apply test with mcp inspector and automated contract fixtures to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Test with MCP Inspector and automated contract fixtures


MCP Inspector helps a human see discovery and calls. Automated fixtures prove the same contract can be replayed.

## See the idea first

Inspector is an interactive MCP client. Use it to initialize the stdio server, inspect tool descriptions and schemas, call read-only tools, stage a hold confirmation, and observe safe failures. It is excellent for spotting confusing descriptions or malformed content.

Inspector is not a repeatable regression suite. A **fixture** is controlled test data or a recorded dependency response. Fixtures make catalog, order, conflict, timeout, and retry scenarios deterministic without depending on a live shop.

Build a contract matrix:

- initialize and `tools/list`;
- valid and invalid `catalog_search`;
- authorized and denied `get_order_status`;
- unconfirmed, confirmed, retried, and conflicting `create_hold`;
- API timeout and unexpected failure;
- clean stdio shutdown.

The provided `checks/r12/test_mcp_contract.py` is the release anchor. It launches `uv run gold-pasal-mcp` through the real stdio transport, initializes a `ClientSession`, checks the three allowed names, rejects `shell` and `sql`, and verifies invalid search arguments return `isError`.

<FailureWorkbench incident="Inspector works, but CI intermittently calls a developer's live API." :hypotheses="['base URL was not injected', 'fixture missed a branch', 'network was not denied in tests']" next-evidence="CI uses a recorded transport, fixed clock, bounded timeout, and no external network." />

## Practice

Run Inspector and save only redacted screenshots or a transcript: discovered tools, one catalog result, an unconfirmed hold, a confirmed idempotent retry, and one safe failure. Then automate each claim with fixtures.

<PredictThenRun prompt="Which Inspector observations need deterministic fixtures before they count as repeatable evidence?" />

Every behavioral claim needs a fixture or public-seam test. Inspector adds communication evidence, but manual success alone cannot protect a regression.

## Worked reasoning

Mocking the tool handler itself would miss JSON-RPC, initialization, schema validation, and stdio. Stub only the external HTTP boundary. Keep request expectations strict so a changed path, header, or payload fails visibly.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

For the rubric, pair the green CI run with the Inspector artifact and a sentence about limits. This supports repeatable Tests and focused Communication.

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
