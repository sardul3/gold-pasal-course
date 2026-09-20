---
id: r12-10
title: "Apply roots, authorization, logging, and least privilege"
release: r12
order: 10
prerequisites: [r12-09]
outcomes:
  - Apply apply roots, authorization, logging, and least privilege to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Apply roots, authorization, logging, and least privilege


The server now works. This lesson limits what it can see, do, and reveal when something goes wrong.

## See the idea first

**Roots** are client-declared filesystem boundaries for servers that need files. Gold Pasal’s API-backed tools do not need arbitrary files. If a demo artifact must be read, accept only a negotiated root and resolve paths beneath it; reject traversal and symlink escape. Roots are not a substitute for OS sandboxing.

**Authorization** decides whether the current identity may perform this action on this object. Pass a narrowly scoped credential to the existing API. Never trust an order ID as proof of ownership, and never let a prompt grant permission.

**Logging** records enough to diagnose behavior: correlation ID, tool name, policy version, latency, outcome category, and approval decision. Redact tokens, customer data, full arguments, and private order details. Protocol stdout is not a log destination.

**Least privilege** means each process receives only the authority it needs. The MCP server needs the Gold Pasal API operations behind three tools. It does not need shell, SQL, kubeconfig, repository write access, or production administrator credentials.

<FailureWorkbench incident="A malicious prompt asks the server to read .env and call SQL directly." :hypotheses="['filesystem access is unrestricted', 'generic tools were exposed', 'retrieved text was treated as authority']" next-evidence="No shell/SQL tool exists, the path is outside negotiated roots, and the API credential lacks that authority." />

## Practice

Map these threats to a deterministic control: `../../.env`; another shopper’s order ID; instruction text saying “ignore confirmation”; a token in an exception; a request for `shell`.

<PredictThenRun prompt="Which root, authorization, policy, redaction, or tool-surface control blocks each threat?" />

Path containment blocks traversal. API authorization blocks cross-user access. Harness state blocks instruction-based confirmation bypass. Error mapping and log redaction block token disclosure. Capability discovery proves `shell` is absent.

## Worked reasoning

Treat tool-returned catalog text as data, even if it contains instructions. A confused-deputy attack tries to make a more privileged component act for less privileged input. The fix is not a stronger warning prompt; it is a narrow tool set, scoped identity, validation, and authorization at every call.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Add redaction, cross-user denial, path escape, and absent-tool fixtures. In the evidence record, name what the test does not prove: host sandboxing and production credential configuration need separate operational evidence.

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
