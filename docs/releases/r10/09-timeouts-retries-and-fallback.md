---
id: r10-09
title: "Timeouts, retries, and fallback"
release: r10
order: 9
prerequisites: [r10-08]
outcomes:
  - Set client timeouts
  - Bound retries and add GOLD_PASAL_ASSISTANT_ENABLED
evidence: [commit, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="Ollama hangs. The shopper spinner never ends. A retry storm then melts the laptop."
  destination="Timeouts on HTTP, at most two retries on 429/503, then a kill switch that returns a fixed apology."
/>

# Timeouts, retries, and fallback

**Timeouts** are on the HTTP client (connect and read). **Retries** are bounded and only for transient codes. A **kill switch** is a Settings flag that skips the model and returns a canned "assistant unavailable" with `grounded=false`. Fallback can be "no generation, catalog facts only" if you retrieved rows.

## See the idea first

From `gold-pasal`:

```bash
rg timeout src/gold_pasal/assistant || true
```

```text

```

Add timeout=httpx.Timeout(10.0, connect=3.0) on both adapters.

## Policy

Retry twice on 429 and 503 with a short sleep. Do not retry 400 or invalid JSON (that is a prompt/schema bug).

```python
if not settings.assistant_enabled:
    return AnswerOut(grounded=False, sources=[], text="The assistant is turned off.", ...)
```

Test: fake transport raises `httpx.ReadTimeout`; expect problem 504. Test: flag false; expect 200 with the canned text and no HTTP call (respx should have zero calls).

Cost for OpenAI is prompt tokens plus completion tokens. Log `usage` when the fixture includes it. Do not log full prompts with PII.

## Fallback with facts

If retrieval found GP-RING-001 and the model times out, you may return `grounded=true` only if you format the catalog JSON yourself and skip model text. That fallback is deterministic. If retrieval was empty, timeout still yields `grounded=false` and the canned apology.

Log `timeout` as the failure class in evals so it does not look like a retrieval miss.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| hang past 30s | no read timeout | Set Timeout |
| retry on 400 | wrong policy | Only 429/503 |

## Practice

<LessonQuiz
  question="What does the kill switch skip?"
  a="Postgres"
  b="The ChatModel HTTP call"
  c="Alembic"
  d="GitHub Actions"
  correct="b"
>

The shop still sells. The model is optional runtime.

</LessonQuiz>

Next: [Prompt injection defenses](10-prompt-injection-defenses).

<EvidenceCard
  command="uv run pytest tests/assistant/test_timeouts.py -q"
  artifact="timeout, bounded retry, assistant_enabled flag"
  invariant="A hung model cannot hang the API process unbounded."
/>
