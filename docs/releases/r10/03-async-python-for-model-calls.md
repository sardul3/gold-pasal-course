---
id: r10-03
title: "Async Python for model calls"
release: r10
order: 3
prerequisites: [r10-02]
outcomes:
  - Write an async ChatModel.complete
  - Await the model from an async route without blocking /health
evidence: [commit, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="A 12-second Ollama call blocks the entire uvicorn worker. Concurrent /health checks wait in line."
  destination="complete() is async. The FastAPI route awaits it. Tests use pytest-asyncio or httpx.AsyncClient."
/>

# Async Python for model calls

**Async** Python lets a coroutine yield while waiting on the network. `async def` plus `await httpx.AsyncClient().post(...)` frees the event loop. FastAPI handlers can be async. Do not call blocking `requests.get` inside them. Ollama and OpenAI both wait on HTTP, so this belongs here, not in R3.

## See the idea first

From `gold-pasal`:

```bash
grep -n 'def complete' -r src/gold_pasal | head
```

```text
src/gold_pasal/assistant/ollama.py:    def complete(self, messages: list[Message]) -> ModelReply:
```

Change that to `async def complete`. Update the Protocol. Update the fake.

## What to type

```python
class ChatModel(Protocol):
    async def complete(self, messages: list[Message]) -> ModelReply: ...
```

In the adapter, `async with httpx.AsyncClient(timeout=30.0) as client:` then `await client.post(...)`. The route:

```python
@router.post("/answers")
async def answers(..., model: ChatModel = Depends(get_chat_model)) -> Answer:
    reply = await model.complete(messages)
```

`GET /health` stays a sync or cheap async handler with no model call. Prove it: run a slow fake `async def complete` that `await asyncio.sleep(2)` and curl /health in another terminal while /answers is in flight. /health should still return 200 quickly.

pytest: mark async tests `@pytest.mark.asyncio` or use HTTPX's async client against `ASGITransport` like R3, with an async fake.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| RuntimeWarning coroutine was never awaited | forgot await | await complete() |
| /health waits 2s | blocking HTTP in the event loop | use AsyncClient, not requests |

## Practice

<LessonQuiz
  question="Why is the model call async?"
  a="So Python becomes multithreaded automatically"
  b="So the event loop can serve other requests while the HTTP call waits"
  c="So Ollama runs faster"
  d="So CI can call OpenAI"
  correct="b"
>

The wait is I/O. Async yields during that wait. It does not speed the model.

</LessonQuiz>

Next: [OpenAI adapter with fixtures](04-openai-adapter-with-fixtures).

<EvidenceCard
  command="uv run pytest tests/http/test_assistant.py -q"
  artifact="async Protocol, async adapter, overlapping /health check"
  invariant="Model I/O does not block health checks."
/>
