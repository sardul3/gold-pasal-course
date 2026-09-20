---
title: "R10 — Local AI shopping assistant"
description: "An evaluated Ollama-backed assistant that cites facts and fails honestly."
---

# R10 — Local AI shopping assistant

**Release promise:** An evaluated Ollama-backed assistant that cites facts and fails honestly.

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

## Lessons

1. [Separate deterministic product logic from probabilistic model behavior](01-separate-deterministic-product-logic-from-probabilistic-model-behavior)
2. [Run Ollama and hide provider details behind an adapter](02-run-ollama-and-hide-provider-details-behind-an-adapter)
3. [Ask for structured output and reject invalid responses](03-ask-for-structured-output-and-reject-invalid-responses)
4. [Version prompts like code and record model configuration](04-version-prompts-like-code-and-record-model-configuration)
5. [Retrieve catalog facts before generating an answer](05-retrieve-catalog-facts-before-generating-an-answer)
6. [Compare keyword, SQLite full-text, and embedding retrieval](06-compare-keyword-sqlite-full-text-and-embedding-retrieval)
7. [Build a small golden evaluation set from shopper questions](07-build-a-small-golden-evaluation-set-from-shopper-questions)
8. [Measure retrieval, answer quality, latency, and failure separately](08-measure-retrieval-answer-quality-latency-and-failure-separately)
9. [Add timeouts, bounded retries, fallback, and a kill switch](09-add-timeouts-bounded-retries-fallback-and-a-kill-switch)
10. [Defend catalog data from prompt injection and untrusted content](10-defend-catalog-data-from-prompt-injection-and-untrusted-content)
11. [Test AI behavior without paid network calls in CI](11-test-ai-behavior-without-paid-network-calls-in-ci)
12. [Release gate: show an evaluated assistant that admits uncertainty](12-release-gate-show-an-evaluated-assistant-that-admits-uncertainty)

## Release evidence

Run `uv run pytest tests/evals/assistant -q` and preserve versioned prompts, recorded fixtures, metrics, and one failure analysis. At the review, defend this
invariant: **probabilistic text cannot override deterministic catalog truth.**

<ArchitectureTrail
  before="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>
