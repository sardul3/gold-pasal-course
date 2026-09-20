---
id: r1-02
title: "Choose strings, integers, booleans, and Decimal for jewelry data"
release: r1
order: 2
prerequisites: [r1-01]
outcomes:
  - Choose str, int, bool, and Decimal for quote fields
  - Show that 0.1 + 0.2 is not 0.3 in binary float
  - Construct Decimal from text, not from float
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="Maya's name, 22K, a membership flag, and NPR amounts are all 'numbers on a slip' until you pick types that keep paisa honest."
  destination="You can print str, int, bool, and Decimal values and show why float is wrong for money."
/>

# Choose strings, integers, booleans, and Decimal for jewelry data

A quote mixes kinds of data. Choosing a type means choosing which operations make sense.

## See the idea first

```python
from decimal import Decimal
customer_name = "Maya"
karat = 22
is_returning_customer = False
rate_per_tola = Decimal("200000")
print(type(customer_name).__name__, customer_name)
print(type(karat).__name__, karat)
print(type(is_returning_customer).__name__, is_returning_customer)
print(rate_per_tola)
print(0.1 + 0.2)
print(Decimal("0.1") + Decimal("0.2"))
```

You should see `str Maya`, `int 22`, `bool False`, `200000`, then `0.30000000000000004`, then `0.3`.

- `str` — text.
- `int` — whole number. Karat stays an integer; `22.5K` is not in this release.
- `bool` — `True` or `False`. Do not apply a discount; none is in the R1 contract.
- `Decimal` — base-10 digits. Build it from text so the digits Sita typed are the digits calculation starts with.

`Decimal(0.1)` preserves the already-rounded binary float. Use `Decimal("0.1")`.

<JavaBridge java="String, int, boolean, BigDecimal." python="str, int, bool, decimal.Decimal." caution="Like BigDecimal, construct Decimal from text for entered decimal values." />

## Write the defect test first

```python
from decimal import Decimal

def test_decimal_tenths_add_exactly() -> None:
    assert Decimal("0.1") + Decimal("0.2") == Decimal("0.3")
```

Run it. If the quote path still uses float, add the smallest Decimal boundary that test needs. Do not implement the complete CLI.

## Practice

Write a test first for `Decimal("1500") * Decimal("5.00")`. Predict NPR 7,500.00 exactly, then add the smallest helper your design needs.

<LessonQuiz
  question="Which constructor keeps the digits 0.1 as decimal tenths?"
  a="Decimal(0.1)"
  b="float('0.1')"
  c="Decimal('0.1')"
  d="0.1"
  correct="c"
>

`Decimal("0.1")` starts from text. `Decimal(0.1)` starts from a binary float.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k decimal_tenths
./scripts/verify.sh
```

Next: [Convert grams and tola](03-convert-grams-and-tola-without-hiding-rounding-rules).

<EvidenceCard
  command="uv run pytest -q -k decimal_tenths"
  artifact="a test that 0.1 + 0.2 as Decimal equals 0.3"
  invariant="money and measured quantities are parsed from text, not through float"
/>
