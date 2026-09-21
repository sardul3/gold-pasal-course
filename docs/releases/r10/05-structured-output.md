---
id: r10-05
title: "Structured output"
release: r10
order: 5
prerequisites: [r10-04]
outcomes:
  - Ask the model for JSON matching a schema
  - Reject invalid JSON before it reaches the shopper
evidence: [commit, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="The model returns a paragraph. The API needed grounded, sources, and text as JSON. Parsing with regex will fail on Tuesday."
  destination="A Pydantic schema validates model JSON. Invalid replies become a 502 problem, not a half-answer."
/>

# Structured output

**Structured output** means the model must return JSON that matches a schema you define, for example `{grounded: bool, sources: list[str], text: str}`. You validate with Pydantic. On failure, the adapter raises; the route returns problem details. Do not send invalid JSON to the shopper as if it were a quote.

## See the idea first

From `gold-pasal`:

```bash
uv run python -c 'from pydantic import BaseModel'
```

```text

```

Pydantic is already a dependency from R3. Reuse it for model replies.

## Schema

```python
class AssistantDraft(BaseModel):
    grounded: bool
    sources: list[str]
    text: str
```

Prompt: "Reply with JSON only matching this schema: ...". After `complete`, `AssistantDraft.model_validate_json(reply.text)`. If validation fails, log the raw text (truncated, no secrets) and raise `ModelReplyError`.

HTTP test: fake `complete` returns `{not json`. Expect 502 and a problem `type` you document.

The catalog still wins: even valid JSON with `grounded: true` and empty retrieval is rewritten to `grounded: false` on the next pages.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| 200 with garbage body | you skipped validation | model_validate_json in the use case |
| pydantic extra fields explode | strict extra=forbid | forbid extras so silent keys cannot appear |

## Practice

<LessonQuiz
  question="What happens when the model returns invalid JSON?"
  a="Forward it to the shopper"
  b="Fail the request with problem details"
  c="Retry forever"
  d="Store it as a quote"
  correct="b"
>

Invalid structure is an adapter failure, not a product answer.

</LessonQuiz>

Next: [Version prompts like code](06-version-prompts-like-code).

<EvidenceCard
  command="uv run pytest tests/http/test_assistant.py -q -k invalid"
  artifact="AssistantDraft schema and a 502 fixture"
  invariant="Shoppers never see unvalidated model bytes as an answer."
/>
