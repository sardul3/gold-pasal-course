---
id: r1-10
title: "Use dataclasses for quote inputs and results"
release: r1
order: 10
prerequisites: [r1-09]
outcomes:
  - Build a frozen QuoteInput with named Decimal and Karat fields
  - Return named gold value, wastage, making, VAT, and total
  - Show FrozenInstanceError when a caller tries to rebind karat
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="Five positional Decimals are easy to swap: rate can land in making charge and still type-check."
  destination="QuoteInput and the result use named fields Sita can read in a test failure."
/>

# Use dataclasses for quote inputs and results

A **dataclass** generates initializer, representation, and equality from annotations. `frozen=True` blocks normal field reassignment after creation. It does not recursively freeze mutable values and does not validate positive numbers.

## See the idea first

Type this in a scratch file or the shop REPL:

```python
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class QuoteInput:
    rate_per_tola: Decimal
    weight_grams: Decimal
    karat: int

req = QuoteInput(
    rate_per_tola=Decimal("200000"),
    weight_grams=Decimal("11.6638038"),
    karat=22,
)
print(req.karat)
req.karat = 24
```

You should see `22`, then `FrozenInstanceError`. The assignment is the line that fails; freeze does not validate positive numbers.

VAT has no CLI option. The [pricing contract](/reference/pricing-contract) fixes 13%.

```python
@dataclass(frozen=True)
class QuoteResult:
    gold_value: Decimal
    wastage: Decimal
    making_charge: Decimal
    vat: Decimal
    total: Decimal
```

## Test the shape first

Author a failing test that constructs `QuoteInput` with named arguments and passes it to `quote`. Assert one known result (one-tola 24K, zero charges). Then add the dataclass and change the function to accept it.

Named fields make `rate_per_tola=` visible. Positional `Decimal` arguments can swap and still look typed.

## Practice

Write a red test that a frozen input cannot be rebound from 22K to 24K after construction. Predict `FrozenInstanceError`. Keep domain validation tests; freezing still accepts `Decimal("-1")`.

<LessonQuiz
  question="Why do named dataclass fields help when rate and making charge are both Decimal?"
  a="They make Pyright slower"
  b="Call sites show which Decimal is which"
  c="They convert grams to tola"
  d="They replace VAT"
  correct="b"
>

Static checking cannot tell two Decimals apart. Names can.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k QuoteInput
./scripts/verify.sh
```

Next: [Pricing CLI](11-build-a-useful-pricing-cli).

<EvidenceCard
  command="uv run pytest -q -k QuoteInput"
  artifact="frozen QuoteInput and named QuoteResult fields"
  invariant="CLI still takes the same five options; VAT stays 13%"
/>
