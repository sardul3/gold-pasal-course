---
id: r12-02
title: "Start and stop a stdio MCP server correctly"
release: r12
order: 2
prerequisites: [r12-01]
outcomes:
  - Apply start and stop a stdio mcp server correctly to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Start and stop a stdio MCP server correctly


Your server will be a child process of the MCP client. Its standard input and output are the protocol connection, so process hygiene is part of correctness.

## See the idea first

`stdio` means standard input and standard output. The client launches `uv run gold-pasal-mcp`, writes framed protocol messages to stdin, and reads responses from stdout. A casual `print("server started")` on stdout corrupts that wire. Human diagnostics belong on stderr or in structured logs.

The lifecycle is:

1. The client starts the configured executable with a known working directory and environment.
2. Client and server initialize and negotiate protocol versions and capabilities.
3. The client makes requests only after initialization succeeds.
4. End-of-file, cancellation, or client exit stops accepting new work.
5. In-flight HTTP work is cancelled or bounded by a timeout; streams and the API client close; the process exits.

An orphan is a child process left running after its parent is gone. Orphans waste resources and can retain credentials. A hung shutdown is also a bug: the client cannot know whether a side effect finished.

<FailureWorkbench incident="The client closes while get_order_status is waiting on the API." :hypotheses="['stdout was polluted', 'HTTP call has no timeout', 'shutdown did not cancel in-flight work']" next-evidence="The child exits within the shutdown budget and stderr carries the correlation log." />

## Work through the boundary

If initialization fails, do not keep serving a half-negotiated session. If the API is slow, the server should return or cancel within its configured deadline. If the client sends EOF, the server should close its shared HTTP client exactly once and exit successfully. Signals may arrive at inconvenient moments, so cleanup belongs in lifecycle management rather than after the main loop.

Do not catch every exception and return success. That makes a broken transport look healthy. Unexpected startup failures should produce a non-zero process exit and a redacted stderr message.

## Practice

Start the server through `ClientSession`, initialize, list tools, and leave both async context managers. Predict whether the process still exists and where startup diagnostics appear.

<PredictThenRun prompt="After the client context closes, what observable process and stream state should remain?" />

The streams should be closed, the child should exit within the test timeout, and stdout should contain protocol traffic only. A timeout or surviving process identifies a lifecycle defect, not a flaky test.

Add a fixture that gives startup and shutdown finite deadlines. Keep it at the process seam; calling an internal `close()` method alone does not prove stdio behavior.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Capture a clean initialize/list/close transcript for the Portfolio Ledger. It proves reproducible local operation, not resilience under every OS signal.

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
