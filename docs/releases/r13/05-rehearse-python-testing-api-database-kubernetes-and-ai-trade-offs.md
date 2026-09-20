---
id: r13-05
title: "Rehearse Python, testing, API, database, Kubernetes, and AI trade-offs"
release: r13
order: 5
prerequisites: [r13-04]
outcomes:
  - Apply rehearse python, testing, api, database, kubernetes, and ai trade-offs to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Rehearse Python, testing, API, database, Kubernetes, and AI trade-offs


Technical interviews test how you reason under changing constraints. Use Gold Pasal evidence instead of reciting definitions.

## See the idea first

**Python:** Explain why async helps the MCP adapter while it waits on HTTP, and why blocking database or CPU work still needs isolation. Name typed boundaries, context-managed resources, specific exceptions, and timeout/cancellation behavior.

**Testing:** Distinguish unit tests, public API contract tests, database integration tests, stdio MCP tests, deployment smoke tests, and incident drills. A mocked helper cannot prove JSON-RPC lifecycle or PostgreSQL locking. A live-only test is hard to replay.

**API:** Describe OpenAPI validation, authenticated object access, stable public IDs, typed error semantics, pagination, timeouts, and idempotency keys. Explain why a domain conflict is not an HTTP transport failure.

**Database:** Trace the last-item hold. Identify the transaction boundary, constraint or lock, idempotency record, rollback behavior, and index trade-off. Say what your test proves and what isolation behavior still depends on PostgreSQL.

**Kubernetes:** Explain readiness versus liveness, immutable image identity, resource bounds, configuration and secrets, rolling update, rollout observation, backward-compatible migrations, and rollback. A healthy pod does not prove the business path works.

**AI/MCP:** The model proposes; typed tools and the harness constrain. Tool schemas reject malformed input, authorization limits objects, confirmation gates holds, idempotency protects retries, and traces support replay. Prompts do not enforce irreversible-action policy.

<FailureWorkbench incident="An answer sounds polished but cannot point to a Gold Pasal artifact." :hypotheses="['definition was memorized', 'claim exceeds evidence', 'trade-off has no revisit trigger']" next-evidence="Answer links to a test, contract, ADR, trace, runbook, or measured result and names its limit." />

## Practice

Answer one question from each topic in ninety seconds. Use four parts: direct claim, design reason, Gold Pasal artifact, and caveat.

<PredictThenRun prompt="How would you answer: 'Why not trust the model to ask for confirmation?'" />

Worked answer: model output is probabilistic and can be influenced by untrusted context, so confirmation is durable harness state bound to the exact hold intent. The unconfirmed fixture proves zero write calls and the confirmed retry proves one logical hold. This does not prove every host UI presents approval clearly.

Ask follow-ups that alter constraints: ten times traffic, stale cache, database failover, incompatible migration, compromised prompt, or CI fixture drift. Change the design only where the new constraint requires it.

Remove filler such as “best practice.” Name the failure it prevents and the evidence you have.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

Record the six answers, their artifact links, and the hardest unanswered follow-up. Turn the gap into a study item, not a fabricated claim.

<EvidenceCard
  command="./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api"
  artifact="curated ADRs, CI/deployment evidence, demo script, and honest résumé bullets"
  invariant="every claim in the presentation points to inspectable evidence and names its limits"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="curated ADRs, CI/deployment evidence, demo script, and honest résumé bullets"
  interview-question="Which decision best demonstrates your engineering judgment, and what would make you revisit it?"
/>
