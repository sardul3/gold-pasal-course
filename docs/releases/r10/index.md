---
title: "R10: Local AI shopping assistant"
description: "An evaluated assistant on Ollama by default, with async I/O and an OpenAI adapter tested from fixtures."
---

# R10: Local AI shopping assistant

**What you'll have:** catalog-wins answers; `ChatModel` with Ollama and OpenAI adapters; async HTTP; structured JSON; versioned prompts; retrieval; evals; timeouts and a kill switch; injection tests. CI never calls a paid API.

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="The assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

## Before you start

You finished [R9](/releases/r9/): a digest-pinned API. Prove `./scripts/verify.sh` is green. Install Ollama for local demos. An OpenAI key is optional and never required in CI.

## Guide

| Page | You will be able to |
| --- | --- |
| [Deterministic vs probabilistic](01-deterministic-vs-probabilistic) | state catalog-wins |
| [Ollama behind a Protocol](02-ollama-behind-a-protocol) | hide the vendor behind ChatModel |
| [Async Python for model calls](03-async-python-for-model-calls) | await HTTP without blocking /health |
| [OpenAI adapter with fixtures](04-openai-adapter-with-fixtures) | test hosted JSON without paying in CI |
| [Structured output](05-structured-output) | validate model JSON |
| [Version prompts like code](06-version-prompts-like-code) | pin prompt_version |
| [Retrieve catalog facts first](07-retrieve-catalog-facts-first) | load rows before generate |
| [Golden evals and metrics](08-golden-evals-and-metrics) | split retrieval from wording |
| [Timeouts, retries, and fallback](09-timeouts-retries-and-fallback) | bound waits and disable the model |
| [Prompt injection defenses](10-prompt-injection-defenses) | treat retrieved text as data |
| [Release gate: honest assistant](11-release-gate-honest-assistant) | evals plus a missing-SKU demo |

## Release evidence

```bash
uv run pytest tests/evals/assistant -q
```
