---
id: r1-06
title: "Extract pricing rules into small functions"
release: r1
order: 6
prerequisites: [r1-05]
outcomes:
  - Write grams_to_tola and calculate_making_charge as functions
  - Test making charge 5 g × NPR 1500 = NPR 7500
  - Keep rounding out of helpers
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="One long quote block can print the right total while hiding which rule is wrong."
  destination="Making charge and wastage each live in a named function you can test alone."
/>

# Extract pricing rules into small functions

A **function** is a named block that accepts inputs and returns a result. A **parameter** is a name in the definition. An **argument** is the value a caller supplies. `return` sends one result back.

## See the idea first

```python
from decimal import Decimal

def calculate_making_charge(weight_grams, charge_per_gram):
    return weight_grams * charge_per_gram

print(calculate_making_charge(Decimal("5.00"), Decimal("1500")))

def wastage_charge(gold_value, wastage_percent):
    return gold_value * (wastage_percent / Decimal("100"))

print(wastage_charge(Decimal("220000"), Decimal("2")))
```

You should see:

```text
7500.00
4400
```

**Refactoring** changes structure without changing observable behavior. If the public quote test turns red after extraction, the move is not yet safe.

Do not round inside every helper. If three components are rounded independently, their displayed sum can differ from a total rounded once.

## Test the rule, then extract

Start from behavior that already passes. Add a focused failing test: `5.00 g × NPR 1,500/g = NPR 7,500.00`. Extract only that arithmetic. Call it from the existing quote path. Rerun focused and full tests.

Keep parameters explicit. A helper that reads a hidden module global for today's rate cannot guarantee the same inputs produce the same result.

## Practice

Write a failing test for 2% wastage on NPR 220,000 metal value. Predict NPR 4,400.00. Name the function after the store rule, not `do_math`.

<LessonQuiz
  question="Should renaming calculate_making_charge change the canonical CLI output?"
  a="Yes; names are part of the quote"
  b="No; public behavior is the printed amounts, not the helper name"
  c="Only if Pyright is on"
  d="Only on Windows"
  correct="b"
>

Internal names are not the customer contract. The printed components are.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k making_charge
./scripts/verify.sh
```

Next: [Validate bad inputs](07-validate-bad-weights-rates-and-karat-values-with-exceptions).

<EvidenceCard
  command="uv run pytest -q -k making_charge"
  artifact="making charge and wastage helpers with focused tests"
  invariant="extraction does not change displayed quote amounts"
/>
