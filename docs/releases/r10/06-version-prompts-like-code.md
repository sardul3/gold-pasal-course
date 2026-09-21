---
id: r10-06
title: "Version prompts like code"
release: r10
order: 6
prerequisites: [r10-05]
outcomes:
  - Store the system prompt in-repo with a version string
  - Echo prompt_version and model id on the response
evidence: [commit, ci-run]
---

<LessonMission
  role="assistant builder"
  problem="The system prompt lives in a notebook cell. Nobody knows which wording produced last week's evals."
  destination="Prompts are files with a version id recorded on every answer."
/>

# Version prompts like code

A **prompt** is code. Put it in `src/gold_pasal/assistant/prompts/v1_shopper.txt` and a constant `PROMPT_VERSION = "v1"`. Settings still names the model. The JSON response includes `prompt_version` and `model`. Changing the file without bumping the version is an untested API change.

## See the idea first

From `gold-pasal`:

```bash
mkdir -p src/gold_pasal/assistant/prompts && ls src/gold_pasal/assistant/prompts
```

```text

```

Add v1_shopper.txt with instructions: use only retrieved catalog facts; if none, say you do not know.

## Record configuration

```python
class AnswerOut(BaseModel):
    grounded: bool
    sources: list[str]
    text: str
    prompt_version: str
    model: str
```

Evals in two pages will group by this pair. If you edit the prompt, bump to `v2` and keep `v1` until evals pass.

Do not concatenate untrusted catalog descriptions into the system prompt without the injection page's rules. For now, retrieved facts go in a clearly delimited user message.

## What not to put in the prompt file

Do not paste the whole catalog. Do not paste staff tokens. Do not tell the model it is allowed to set `grounded` however it wants; Python will overwrite that bit after retrieval.

If two developers edit `v1_shopper.txt` on one day, bump to `v2` on purpose so evals from the morning are not silently mixed with the afternoon wording.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| prompt in the route string | unversioned | Move to a file and a constant |
| version missing on 200 | schema incomplete | Add the fields |

## Practice

<LessonQuiz
  question="When you change shopper wording, what else changes?"
  a="Nothing"
  b="PROMPT_VERSION, and you re-run evals"
  c="The Postgres schema"
  d="The kind digest automatically"
  correct="b"
>

Evals are meaningless if you cannot name the prompt that produced them.

</LessonQuiz>

Next: [Retrieve catalog facts first](07-retrieve-catalog-facts-first).

<EvidenceCard
  command="rg PROMPT_VERSION src/gold_pasal"
  artifact="versioned prompt file and fields on the response"
  invariant="Prompt, model id, and code are pinned together."
/>
