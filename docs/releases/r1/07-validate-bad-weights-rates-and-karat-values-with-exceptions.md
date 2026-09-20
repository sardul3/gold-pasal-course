---
id: r1-07
title: "Validate bad weights, rates, and karat values with exceptions"
release: r1
order: 7
prerequisites: [r1-06]
outcomes:
  - Raise ValueError for non-positive weight
  - Reject karat 21 before purity arithmetic
  - Keep one failure per test
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="A scale cannot report negative gold mass. If 21K silently becomes 24K, Maya is overcharged."
  destination="Zero weight and karat 21 raise ValueError with a message that names the bad field."
/>

# Validate bad weights, rates, and karat values with exceptions

**Validation** checks domain rules before calculation. An **exception** interrupts normal execution. `raise` creates the failure path. `ValueError` means the value is the wrong meaning even if the Python type is fine.

## See the idea first

Type this (the shop uses the same guard):

```python
from decimal import Decimal

def require_positive_weight(weight_grams):
    if not weight_grams > Decimal("0"):
        raise ValueError("weight_grams must be greater than zero")
    return weight_grams

print(require_positive_weight(Decimal("11.6638038")))
try:
    require_positive_weight(Decimal("0"))
except ValueError as error:
    print(type(error).__name__)
    print(error)
```

You should see the valid weight printed, then:

```text
ValueError
weight_grams must be greater than zero
```

Do not catch the exception inside the calculation only to return zero. The CLI boundary must turn it into a non-zero exit.

## Write each failure first

```python
import pytest
from decimal import Decimal

def test_zero_weight_is_rejected() -> None:
    with pytest.raises(ValueError, match="weight"):
        quote(weight_grams=Decimal("0"), ...)
```

Run it red. Add the smallest guard. Repeat for negative weight, zero or negative rate, unsupported karat, negative wastage, and negative making charge. Do not combine all bad inputs in one test.

On invalid input, later pricing lines must not run. Do not catch broad `Exception`.

## Practice

Write the unsupported `21K` test first. Predict a `ValueError` whose message contains `21`. Then implement one consistent path.

<LessonQuiz
  question="If weight and rate are both invalid, what should a good test suite prove?"
  a="One test with both bad values is enough"
  b="Each rule has its own test so a failure names one field"
  c="Return total NPR 0"
  d="Print a traceback to the customer"
  correct="b"
>

One failure should tell you which rule broke. A traceback is for developers; Sita needs a short message.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k zero_weight
./scripts/verify.sh
```

Next: [Modules and packages](08-split-the-quote-desk-into-modules-and-packages).

<EvidenceCard
  command="uv run pytest -q -k zero_weight"
  artifact="ValueError tests for zero weight and karat 21"
  invariant="invalid input does not print a quote total"
/>
