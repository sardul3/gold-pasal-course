---
id: r11-09
title: "Release gate: stop conditions"
release: r11
order: 9
prerequisites: [r11-08]
outcomes:
  - Demo the approval boundary
  - Show evals for trajectories and red-team
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="staff assistant operator"
  problem="A reviewer asks what stops the agent. You point at the prompt."
  destination="A demo: search, propose hold, stop for confirm; a second demo: unknown tool rejected; evals green."
/>

# Release gate: stop conditions

This is the release gate. Stop conditions are max steps, deadline, allowlist, and awaiting_approval. Defend them without reading a script of slogans: show the tests and one curl transcript.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/evals/agent -q
```

```text
... passed
```

Green evals first, then the live demo against the API.

## Demo

1. Start a run: "Find GP-N-042 and hold it"
2. Show status awaiting_approval and no new hold row
3. Confirm with staff token; hold exists
4. Start a run that asks for bash; rejected_tool

R12 exposes a subset of these tools over MCP. Same API, same confirmation.

## Interview sentence

"Checkout is a script. Holds from natural language go through tools, a step cap, and a staff confirm route. The model cannot approve itself." If you cannot point at the test that proves the last sentence, the gate is not done.

## Evidence pack

Attach: eval pytest output, one JSON log line with `run_id`, screenshot or curl of awaiting_approval, SQL or API proof that the hold row appeared only after confirm. If any of those is missing, you demonstrated a chatbot, not an agent.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| hold without confirm in demo | failed the product | Fix harness before the gate |
| evals skipped | CI hole | Make pytest required |

## Practice

<LessonQuiz
  question="What is not an acceptable stop condition?"
  a="max_steps in code"
  b="The model will notice it is done"
  c="deadline_s"
  d="allowlist"
  correct="b"
>

Models do not reliably stop. Harnesses do.

</LessonQuiz>

<EvidenceCard
  command="uv run pytest tests/evals/agent -q"
  artifact="demo transcript plus eval report"
  invariant="Stop and approval are enforced outside the model."
/>
