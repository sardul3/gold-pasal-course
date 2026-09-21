---
id: r10-04
title: "OpenAI adapter with fixtures"
release: r10
order: 4
prerequisites: [r10-03]
outcomes:
  - Implement an OpenAI adapter behind ChatModel
  - Replay with respx or pytest-httpx fixtures
evidence: [commit, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="An FDE must call a hosted provider. The course also forbids paid APIs in CI."
  destination="OpenAIChatModel implements ChatModel. Tests replay recorded HTTP. CI never needs OPENAI_API_KEY."
/>

# OpenAI adapter with fixtures

The [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) is HTTP. Your adapter sends `messages` and reads `choices[0].message.content`. **Recorded fixtures** are JSON bodies saved from one local call (redact keys). `respx` or `pytest-httpx` matches the URL and returns that body. Select the adapter with `GOLD_PASAL_CHAT_PROVIDER=ollama|openai`. Default ollama.

## See the idea first

From `gold-pasal`:

```bash
uv add httpx respx --group dev && grep -n ChatModel src/gold_pasal -r | head
```

```text
...
```

If respx is already there, skip add. Never commit `sk-` keys. `.env` stays gitignored.

## Adapter and fixture

`OpenAIChatModel` uses `AsyncClient` and `Authorization: Bearer $OPENAI_API_KEY`. Base URL from Settings so you can point at a mock.

```python
# tests/assistant/test_openai_adapter.py
import respx
from httpx import Response

@respx.mock
async def test_complete_reads_content() -> None:
    respx.post("https://api.openai.com/v1/chat/completions").mock(
        return_value=Response(200, json=load_fixture("openai_chat_22k.json"))
    )
    reply = await OpenAIChatModel(settings).complete([Message(role="user", content="Is GP-RING-001 22K?")])
    assert "22" in reply.text
```

Record a fixture once on your machine if you have a key; otherwise write a minimal JSON that matches the real schema. CI uses only the fixture.

Do not call the live API from `application-ci`. A live optional job is not part of this course.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| 401 in CI | a test hit the live API | assert respx calls; no network |
| sk- in git | fixture captured Authorization | Redact; rotate the key |

## Practice

<LessonQuiz
  question="How does CI test the OpenAI adapter?"
  a="With a company credit card in GitHub secrets"
  b="By replaying a recorded JSON body"
  c="By skipping the tests"
  d="By using Ollama in Actions only"
  correct="b"
>

Fixtures keep the schema honest. Ollama remains the default demo. Both are ChatModel.

</LessonQuiz>

Next: [Structured output](05-structured-output).

<EvidenceCard
  command="uv run pytest tests/assistant/test_openai_adapter.py -q"
  artifact="OpenAI adapter plus a committed fixture without secrets"
  invariant="CI never calls a paid API."
/>
