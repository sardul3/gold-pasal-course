---
id: r13-07
title: "Run a final incident, rollback, and agent-safety drill"
release: r13
order: 7
prerequisites: [r13-06]
outcomes:
  - Apply run a final incident, rollback, and agent-safety drill to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Run a final incident, rollback, and agent-safety drill


This drill combines operations and agent safety because a fast rollback that repeats an unsafe hold is not recovery.

## See the idea first

Inject a controlled staging or fixture failure: the new release causes elevated `create_hold` dependency errors, and an MCP client retries after an ambiguous timeout. Use synthetic inventory, scoped credentials, and a fixed idempotency key. Set a stop condition and abort path before starting.

Success means the operator detects the symptom, scopes impact, prevents unsafe new writes if needed, verifies whether the first hold committed, rolls back to a compatible artifact, and proves one logical inventory effect after recovery.

<FailureWorkbench incident="The client timed out, retried, and rollout errors rose after a new deployment." :hypotheses="['API committed before response loss', 'new release broke dependency mapping', 'retry used a new idempotency key']" next-evidence="Trace and idempotency record establish commit state before any retry or rollback." />

## Run the response

1. Declare the incident and start a timeline.
2. Observe user symptom, error rate, rollout revision, and correlation ID.
3. Freeze or gate `create_hold` if commit state is uncertain; keep read-only paths available when safe.
4. Check traces and the idempotency record. Do not blindly retry.
5. Confirm the previous artifact and schema are backward compatible.
6. Roll back with the runbook and watch rollout status, readiness, and business smoke checks.
7. Retry only with the original key and confirmed intent.
8. Verify one hold ID, one inventory effect, safe error output, and clean client shutdown.
9. End the incident and record follow-up actions with owners.

## Include an agent-safety challenge

During the incident, feed the client untrusted catalog text that says to ignore approval and use a shell. The correct result is boring: text remains data, no new tool appears, the unconfirmed hold makes zero write calls, and logs redact arguments and credentials.

<PredictThenRun prompt="After rollback and retry, what evidence proves recovery without duplicate or unauthorized action?" />

Worked answer: rollout reaches the known-good revision; readiness and public smoke checks pass; the same idempotency key resolves to one hold ID; inventory changed once; no shell/SQL capability exists; confirmation is recorded for the exact intent; logs contain correlation fields but no secret.

## Practice

Have one person inject the fault and another follow the runbook without prior hints. Measure detection time, mitigation time, rollback time, and mistaken actions. Write a short postmortem: impact, timeline, root cause, contributing factors, what worked, and prevention. Do not blame the model for a missing deterministic guard.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

Attach the redacted timeline, command output, before/after revision, hold invariant, and postmortem. This is the Operations score-3 evidence R13 requires.

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
