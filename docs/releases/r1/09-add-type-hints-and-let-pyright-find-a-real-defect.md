---
id: r1-09
title: "Add type hints and let Pyright find a real defect"
release: r1
order: 9
prerequisites: [r1-08]
outcomes:
  - Annotate grams_to_tola as Decimal to Decimal
  - Reproduce a Pyright error when str crosses a Decimal parameter
  - Repair by parsing at the CLI boundary, not with type: ignore
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="Python will mix str weight text into Decimal arithmetic until a checker or a bad total catches it."
  destination="Pyright reports unparsed weight text; the fix is parsing, not silencing the checker."
/>

# Add type hints and let Pyright find a real defect

A **type hint** describes the value a function expects or returns. **Pyright** is this repository's static type checker. It reads hints without running the bad path. It does not prove a weight is positive; tests still own that.

## See the idea first

```python
from decimal import Decimal

def grams_to_tola(weight_grams: Decimal) -> Decimal:
    return weight_grams / Decimal("11.6638038")
```

The annotation says callers provide a Decimal and receive a Decimal. It does not validate a customer's raw text at runtime.

Keep behavior tests green. Then, on an uncommitted change, pass CLI text into a Decimal-typed function:

```python
quote(weight_grams="11.6638038")
```

From `gold-pasal`:

```bash
uv run pyright
```

You should see an incompatible-argument diagnostic on that call. Repair by parsing at the CLI boundary:

```python
weight = Decimal(raw_weight_text)
```

Do not weaken the parameter to `object` or add `# type: ignore`.

```python
def label(karat):
    return str(karat) + "K"
print(label(22))
```

You should see `22K`. Python still runs `label("22")` if you try it. Pyright would complain; pytest would only fail if a test hit that branch.

## Practice

Write a typed function that expects a karat enum member and pass raw integer `22`. Predict the diagnostic, run `uv run pyright`, then convert once at the boundary.

<LessonQuiz
  question="Can Pyright prove that Decimal('-1') is an invalid jewelry weight?"
  a="Yes; negative is a different type"
  b="No; both signs are Decimal, so tests and validation own that rule"
  c="Yes, if you add Any"
  d="Only in pytest"
  correct="b"
>

Positive and negative values share the type. Value constraints stay in tests.

</LessonQuiz>

## Check

```bash
uv run pyright
./scripts/verify.sh
```

Do not commit the planted defect.

Next: [Dataclasses](10-use-dataclasses-for-quote-inputs-and-results).

<EvidenceCard
  command="uv run pyright"
  artifact="public functions annotated; one quoted diagnostic that parsing fixed"
  invariant="type hints do not replace positive-weight tests"
/>
