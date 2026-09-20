---
title: Evidence rubric
description: How course activity becomes credible portfolio proof.
---

# Evidence rubric

The course records activity locally, but competency is demonstrated outside the browser.

## Read

You can describe the lesson’s business problem and identify the new concept. This state helps you resume the course. It does not prove that you can apply the idea.

## Practiced

You ran the guided exercise, made the requested change, and passed the lesson check. Record the command and one sentence about the result.

## Proven

Attach durable evidence that another engineer can inspect:

- a commit or pull request for behavior and design decisions
- a CI run for repeatable quality gates
- an ADR for a meaningful trade-off
- a deployment URL or screenshot for runtime behavior
- a runbook or postmortem for operational skill
- an evaluation report and trace for probabilistic behavior

## Release-gate scoring

Score each dimension from 0 to 3.

| Dimension | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Behavior | Missing | Happy path only | Acceptance cases pass | Failure and recovery paths pass |
| Tests | Missing | Implementation-coupled | Public seams covered | Risky boundaries and regressions covered |
| Design | Accidental | Can describe structure | Trade-offs recorded | Invariants and boundaries are defended |
| Operations | Cannot run | Runs locally once | Reproducible commands | Observable deployment and rollback proof |
| Communication | No evidence | Unstructured notes | Focused demo | Interview-ready explanation with caveats |

A release is **Proven** when every dimension scores at least 2. R13 requires at least 3 in Behavior, Operations, and Communication.

## Evidence integrity

Do not paste secrets, private cluster addresses, customer data, or fabricated CI/deployment links. A missing artifact is better than invented evidence.
