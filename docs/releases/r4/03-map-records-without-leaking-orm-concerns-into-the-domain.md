---
id: r4-03
title: "Map records without leaking ORM concerns into the domain"
release: r4
order: 3
prerequisites: [r4-02]
outcomes:
  - Apply map records without leaking orm concerns into the domain to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Map records without leaking ORM concerns into the domain


This is step 3 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A hold should be understandable to a jeweler without knowing what lazy loading or an ORM proxy means. If business code must keep a SQLAlchemy session open just to read `hold.stock_item_id`, persistence has leaked into the core model.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

Use two representations for two jobs. The domain object expresses rules such as “expiry must be after creation” and “an expired hold cannot become an order.” The ORM record expresses columns, relationships, indexes, and database types. A mapper copies values between them. This resembles separating a Java domain record from a Hibernate `@Entity`, especially when you want tests that do not boot Spring.

Do not return ORM rows from controllers. Detached rows can trigger hidden queries, serialize internal fields, or fail after the session closes. Map identifiers and UTC instants explicitly. Keep money as an integer minor unit or an exact decimal according to the earlier contract, never a binary float.

## Check it by hand

A database row contains `hold_id=H-731`, `stock_item_id=GP-N-042`, `customer_id=C-SITA`, `created_at=04:15Z`, and `expires_at=04:30Z`. The domain hold should carry those values and answer whether it is active for a supplied clock. It should not carry `Session`, table names, or a `Row` object.

## Start with a failing test

Write a failing mapper test with the five concrete values above. Round-trip domain → record → domain and compare values. Add a domain test that rejects `expires_at == created_at`. Then write a repository integration test proving the mapper works against PostgreSQL. The learner writes both tests and every production class; this page supplies behavior, not a finished implementation.

## Trace the non-trivial flow

On a hold request, the controller parses JSON, the application service creates or loads a domain hold, and the repository maps it to a record. After flush, generated identifiers may be copied back deliberately. Commit remains outside the mapper. If a uniqueness or lock conflict occurs, let the repository classify the database error and let the HTTP boundary render the agreed problem response.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Add a nullable `released_at` column to the persistence sketch but not the domain constructor. Decide whether “not released” is absence or a special timestamp. Predict the round-trip values before writing the test.

## Worked reasoning

The mapper is intentionally boring and explicit. It prevents persistence lifecycle rules from becoming business rules. A mapper round trip proves value preservation, while the repository test proves the SQL shape; neither substitutes for the concurrent API check.

## Check

```bash
uv run pytest tests/integration/inventory -q
```

Run the narrow test you wrote first, then this release check. Read the exit status and one meaningful identifier or count; green output without an explanation is incomplete evidence.

<EvidenceCard
  command="uv run pytest tests/integration/inventory -q"
  artifact="a migration plus a passing concurrent-reservation integration test"
  invariant="one physical item cannot have two active holds"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a migration plus a passing concurrent-reservation integration test"
  interview-question="Where should transaction boundaries live, and why?"
/>
