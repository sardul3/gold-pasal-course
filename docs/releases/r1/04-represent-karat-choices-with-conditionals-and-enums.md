---
id: r1-04
title: "Represent karat choices with conditionals and enums"
release: r1
order: 4
prerequisites: [r1-03]
outcomes:
  - Compute 22K purity as 22/24
  - Use if/elif for karat and an Enum for the closed set 14, 18, 22, 24
  - Reject 21K instead of silently treating it as 24K
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="A 22K piece is not 24K. If 21 slips through as 24, Maya is overcharged."
  destination="You can print 22K metal value by hand and keep karat in a closed set of names."
/>

# Represent karat choices with conditionals and enums

Karat states how many of 24 parts are gold. 24K uses factor `1`. 22K uses `22 / 24`.

## See the idea first

```python
from decimal import Decimal
rate = Decimal("200000")
karat = 22
gold_value = rate * Decimal(karat) / Decimal(24)
print(gold_value)
if karat == 24:
    label = "full"
elif karat == 22:
    label = "twenty-two parts"
else:
    label = "other"
print(label)
```

You should see:

```text
183333.3333333333333333333333
twenty-two parts
```

A **conditional** chooses a path from a Boolean test. An **enum** is a closed set of named choices. `Karat.K22` communicates more than the bare integer `22`.

```python
from enum import Enum

class Karat(Enum):
    K14 = 14
    K18 = 18
    K22 = 22
    K24 = 24
```

The enum does not validate raw CLI text by itself. Parse at the boundary.

## Test the choices first

```python
def test_24k_uses_the_full_rate() -> None:
    # One tola at NPR 240,000 → metal NPR 240,000
    ...


def test_22k_uses_twenty_two_of_twenty_four_parts() -> None:
    # One tola at NPR 240,000 → metal NPR 220,000
    ...
```

Hand-check: `240000 / 24 = 10000`, then `10000 × 22 = 220000`. Run red, then add the smallest enum and branch.

Do not use a catch-all that treats unknown `21` as 24K. Lesson 7 makes the failure path explicit; this page must not invent a purity factor for 21.

## Practice

At NPR 240,000 per tola, 18K metal value is `18/24 × 240000 = 180000`. Write that test first. Then write an unsupported-`21` test that must not produce a quote.

<LessonQuiz
  question="At NPR 240,000 per tola, what is one tola of 18K metal value before wastage?"
  a="NPR 200,000"
  b="NPR 180,000"
  c="NPR 240,000"
  d="NPR 18,000"
  correct="b"
>

`18 / 24 = 3 / 4`. Three quarters of 240,000 is 180,000.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k karat
./scripts/verify.sh
```

Next: [Lists, tuples, sets, and dictionaries](05-price-several-products-with-lists-tuples-sets-and-dictionaries).

<EvidenceCard
  command="uv run pytest -q -k karat"
  artifact="tests for 24K, 22K, and rejected 21K"
  invariant="unsupported karat does not receive a purity factor"
/>
