---
id: r10-02
title: "Ollama behind a Protocol"
release: r10
order: 2
prerequisites: [r10-01]
outcomes:
  - Define a Protocol for complete() with a typed prompt and reply
  - Implement OllamaChatModel against localhost:11434
evidence: [commit, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="Every call is going to be `requests.post('http://localhost:11434')` sprinkled in routes. Switching providers later will mean a rewrite."
  destination="A ChatModel Protocol with an Ollama adapter. Routes depend on the Protocol."
/>

# Ollama behind a Protocol

**Ollama** runs local models. A **Protocol** (R1, R2) is the shape: `complete(messages: list[Message]) -> ModelReply`. FastAPI depends on that Protocol, the same way checkout depends on a payment port. Default in this course is Ollama so you can demo without a paid key.

## See the idea first

From `gold-pasal`:

```bash
curl -s http://127.0.0.1:11434/api/tags || echo 'ollama not running'
```

```text
{"models":[{"name":"llama3.2:..."}]}
```

Install from ollama.com, then `ollama pull llama3.2`. If tags is empty, pull first. CI will not call this URL.

## Adapter

```python
class ChatModel(Protocol):
    def complete(self, messages: list[Message]) -> ModelReply: ...
```

`OllamaChatModel` posts to `/api/chat` with `model` from Settings (`GOLD_PASAL_OLLAMA_MODEL`). Timeouts wait for the async page. For now a short `httpx` timeout is enough.

Wire the adapter in a FastAPI dependency. Tests inject a fake that returns a fixed string. Never import `ollama` from a domain module.

Record `model` and `base_url` in Settings. Do not hard-code `llama3.2` in the route.

## Settings keys

`GOLD_PASAL_CHAT_PROVIDER` is `ollama` by default. `GOLD_PASAL_OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`. `GOLD_PASAL_OLLAMA_MODEL` is the tag you pulled. Tests set provider to a fake in the FastAPI dependency override, the same pattern as the payment port in R5.

If Ollama is down, the adapter raises a typed connection error. The route maps it to 503, not a stack trace. You will tighten timeouts two pages later.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| connection refused 11434 | Ollama not running | Start Ollama; keep tests on a fake |
| route imports httpx to 11434 | no port | Move HTTP into the adapter |

## Practice

<LessonQuiz
  question="What do HTTP tests use for the model?"
  a="Paid OpenAI every time"
  b="A fake ChatModel"
  c="A real GPU in Actions"
  d="subprocess to ollama"
  correct="b"
>

The Protocol exists so tests and CI never need a daemon.

</LessonQuiz>

Next: [Async Python for model calls](03-async-python-for-model-calls).

<EvidenceCard
  command="curl -s http://127.0.0.1:11434/api/tags | head -c 80"
  artifact="ChatModel Protocol and Ollama adapter"
  invariant="Routes depend on ChatModel, not on Ollama types."
/>
