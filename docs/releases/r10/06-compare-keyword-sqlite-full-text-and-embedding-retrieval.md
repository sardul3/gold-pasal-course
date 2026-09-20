---
id: r10-06
title: "Compare keyword, SQLite full-text, and embedding retrieval"
release: r10
order: 6
prerequisites: [r10-05]
outcomes:
  - Apply compare keyword, sqlite full-text, and embedding retrieval to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Compare keyword, SQLite full-text, and embedding retrieval


This is step 6 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A shopper may type an exact SKU, “22K ring,” or “yellow-gold band for a wedding.” Those queries reward different retrieval methods.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

**Keyword retrieval** compares literal normalized tokens. It is transparent and excellent for exact identifiers, but it misses synonyms such as “band” versus “ring.”

**SQLite full-text search (FTS)** uses an inverted index—a map from each token to matching rows. It handles tokenization, ranking, and prefixes better than hand-written `LIKE`, while remaining lexical: words still need to overlap.

**Embedding retrieval** converts text into numeric vectors and compares distance. It can match related meaning without shared words, but scores are not probabilities, model changes require re-indexing, and exact SKU lookup can be worse. A hybrid can route exact IDs first and use FTS or embeddings for descriptive queries.

### Check the idea by hand

- `GP-RING-001`: direct/keyword lookup should rank the exact SKU first.
- `22K ring`: FTS can match both terms and rank records containing both.
- `wedding band`: embeddings may find a ring even if “band” is absent; inspect false positives before choosing it.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Create one fixed query set with expected record IDs. Run the same contract against three retriever implementations and calculate recall-at-k. Include an exact-SKU case, a lexical case, and a synonym case.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Implement retrievers behind one `Protocol` and return record ID plus score and method. Keep score meanings method-specific; do not compare an FTS score directly with cosine similarity.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

For each query, print or record the top three IDs. Explain why a method succeeded from its matching mechanism, not from one lucky example.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Add “bridal band under the approved catalog.” Predict which method gains recall and which may add irrelevant jewelry. Run the narrow pytest test first, then the release check.

## Worked reasoning

There is no universally best retriever. Pick from measured query slices, with direct SKU lookup as a deterministic fast path and a documented latency/quality trade-off. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

## Check

Start the learner-owned Gold Pasal application and run the course-owned black-box check from the course repository:

```bash
uv run --project checks pytest checks/r10/test_assistant_eval.py -q
```

For R10, inspect `grounded`, `sources`, `prompt_version`, and `model`. For R11, inspect `status`, `steps`, `pending_action`, and whether any forbidden tool executed. A green exit code is evidence only when you can explain which product boundary each assertion protects.

<EvidenceCard
  command="uv run pytest tests/evals/assistant -q"
  artifact="versioned prompts, recorded fixtures, metrics, and one failure analysis"
  invariant="probabilistic text cannot override deterministic catalog truth"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="versioned prompts, recorded fixtures, metrics, and one failure analysis"
  interview-question="How do you evaluate retrieval separately from generation?"
/>
