---
id: r10-11
title: "Release gate: honest assistant"
release: r10
order: 11
prerequisites: [r10-10]
outcomes:
  - Run evals in CI mode
  - Demo uncertainty on a missing SKU
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="assistant builder"
  problem="A reviewer asks whether the assistant will invent a 22K ring. You have a laptop demo and no eval file."
  destination="Evals green on fakes; one live Ollama demo that admits GP-NOT-REAL is unknown; OpenAI path proven by fixtures."
/>

# Release gate: honest assistant

This is the release gate. CI runs `tests/evals/assistant` with fakes and OpenAI fixtures. Locally, with Ollama, ask about GP-NOT-REAL and show `grounded: false`. Show `prompt_version` and `model` on the body. Do not enable a live OpenAI call in Actions.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/evals/assistant -q
```

```text
... passed
```

If this is red, fix evals before the demo.

## Demo

```bash
curl -s http://127.0.0.1:8000/api/assistant/answers \
  -H 'Content-Type: application/json' \
  -d '{"question":"Is GP-NOT-REAL 22K?"}'
```

Expect `grounded` false and no invented SKU.

Then a true SKU question with Ollama running, sources containing that SKU.

R11 adds tools and approvals. It will reuse ChatModel and retrieval.

## What to say in the demo

Show the JSON fields, not a chat UI, unless you already have /demo from a later release. Point at `prompt_version`, `model`, `grounded`, and `sources`. For the missing SKU, `sources` is empty.

Mention that OpenAI was tested with a fixture file in git. If they ask you to run a live paid call, that is optional on your laptop and out of the CI contract.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| CI needs Ollama | real HTTP in evals | Fakes and respx |
| grounded true on missing SKU | harness bug | Force false |

## Practice

<LessonQuiz
  question="What must CI never do?"
  a="Run pytest"
  b="Call a paid model API"
  c="Load JSON fixtures"
  d="Compile Python"
  correct="b"
>

The course rule. Fixtures cover the OpenAI adapter.

</LessonQuiz>

<EvidenceCard
  command="uv run pytest tests/evals/assistant -q"
  artifact="eval report, curl of GP-NOT-REAL, fixture test for OpenAI"
  invariant="The assistant can say it does not know."
/>
