---
id: r11-07
title: "Golden trajectories"
release: r11
order: 7
prerequisites: [r11-06]
outcomes:
  - Store expected tool names per gold question
  - Fail when the trajectory diverges
evidence: [evaluation]
---

<LessonMission
  role="staff assistant operator"
  problem="Evals only check the final sentence. The agent held the wrong SKU and still said success."
  destination="Golden tool sequences plus outcome checks, including timeout and partial failure."
/>

# Golden trajectories

A **trajectory** is the list of tools actually called. Gold: "hold GP-N-042" expects `search_catalog` then `propose_hold`, never `get_order`. Also test a tool timeout: fake search raises ReadTimeout; run status is failed; no hold.

## See the idea first

From `gold-pasal`:

```bash
mkdir -p evals/agent && ls evals/agent
```

```text

```

JSONL: id, question, expected_tools, expected_status.

## Runner

Drive the harness with a fake ChatModel that emits planned function calls (not a live model in CI). Compare the tool name list. Score separately: task success, unsafe calls (should be 0), extra steps, confirmation respected.

Handle failures here: model JSON invalid, tool 409 conflict, retry once then terminal failed. Do not need a second lesson for retries if the tests are on this page.

Unsafe: model asks to hold without search when policy says search first; harness may still allow it if schema permits. If your policy requires search, enforce it in code or fail the gold case.

## Partial success

Tool search succeeds, propose_hold fails 409 because the item is held. Trajectory: search_catalog, propose_hold. Status: failed or awaiting_approval with an error payload, never succeeded. The gold file should name that 409 case so a later prompt change cannot swallow it into a cheerful sentence.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| CI live model | flake | Scripted fake actions |
| only final text scored | missed wrong SKU | Compare tools |

## Practice

<LessonQuiz
  question="Why score trajectories, not only the final string?"
  a="Strings are illegal"
  b="The wrong tool can still produce a confident sentence"
  c="GitHub requires it"
  d="Ollama cannot return text"
  correct="b"
>

Holds are actions. Actions are the eval.

</LessonQuiz>

Next: [Red-team the agent](08-red-team-the-agent).

<EvidenceCard
  command="uv run pytest tests/evals/agent -q"
  artifact="gold trajectories and timeout case"
  invariant="A hold in the trajectory must match confirmation policy."
/>
