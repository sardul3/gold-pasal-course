---
id: r2-01
title: "Value objects: Money, Weight, Purity"
release: r2
order: 1
prerequisites: []
outcomes:
  - Write frozen dataclasses that validate in __post_init__
  - Add arithmetic and ordering with dunder methods
  - Test the types on their own in tests/unit/domain
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="quote() takes five Decimals. Nothing stops a caller passing grams where the rate goes, or a float that looks like NPR. Every function re-checks the same karat list."
  destination="Money, Weight, and Purity each carry one meaning, refuse impossible values when built, and know how to add, scale, round, and print themselves."
/>

# Value objects: Money, Weight, Purity

A **value object** is a small immutable type defined by its value, not its identity: two `Money` amounts of `NPR 5` are the same money. It validates once, when it is built, so every function that receives one can trust it. This page writes the three the pricing desk needs.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from decimal import Decimal
>>> from dataclasses import dataclass
>>> @dataclass(frozen=True)
... class Money:
...     amount: Decimal
...     def __add__(self, other: "Money") -> "Money":
...         return Money(self.amount + other.amount)
...
>>> Money(Decimal("1")) + Money(Decimal("2.5"))
Money(amount=Decimal('3.5'))
```

`__add__` is what Python calls for `+`. Defining it on `Money` means `Money + Money` works and `Money + Decimal` does not, which is the point: grams and rupees should not add.

## The module

Create `src/gold_pasal/domain.py`:

```python
"""Value objects: one meaning per type, validated at construction."""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from gold_pasal.errors import NonPositiveAmountError, UnsupportedKaratError
from gold_pasal.units import grams_to_tola

SUPPORTED_KARATS = (14, 18, 22, 24)
PAISA = Decimal("0.01")


@dataclass(frozen=True, order=True)
class Money:
    """An NPR amount at full precision. Round only with `rounded()`."""

    amount: Decimal

    def __post_init__(self) -> None:
        if type(self.amount) is not Decimal:
            raise TypeError(f"Money.amount must be a Decimal, got {type(self.amount).__name__}")

    @classmethod
    def npr(cls, text: str) -> "Money":
        return cls(Decimal(text))

    def __add__(self, other: "Money") -> "Money":
        return Money(self.amount + other.amount)

    def __sub__(self, other: "Money") -> "Money":
        return Money(self.amount - other.amount)

    def __mul__(self, factor: Decimal | int) -> "Money":
        return Money(self.amount * Decimal(factor))

    __rmul__ = __mul__

    def rounded(self) -> "Money":
        return Money(self.amount.quantize(PAISA, rounding=ROUND_HALF_UP))

    def __str__(self) -> str:
        return f"NPR {self.rounded().amount}"


@dataclass(frozen=True, order=True)
class Weight:
    """A mass in grams. Always positive."""

    grams: Decimal

    def __post_init__(self) -> None:
        if self.grams <= 0:
            raise NonPositiveAmountError("weight_grams", self.grams)

    @property
    def tola(self) -> Decimal:
        return grams_to_tola(self.grams)

    def __str__(self) -> str:
        return f"{self.grams} g"


@dataclass(frozen=True, order=True)
class Purity:
    """Gold purity as a karat stamp the shop sells."""

    karat: int

    def __post_init__(self) -> None:
        if self.karat not in SUPPORTED_KARATS:
            raise UnsupportedKaratError(self.karat)

    @property
    def factor(self) -> Decimal:
        return Decimal(self.karat) / Decimal(24)

    def __str__(self) -> str:
        return f"{self.karat}K"
```

The exceptions come from `src/gold_pasal/errors.py`, written in [R1](/releases/r1/02-exceptions-and-error-handling). The tola conversion comes from `units.py`. Nothing here imports `pricing`; the domain types sit below it.

## Try each type

```python
>>> from gold_pasal.domain import Money, Weight, Purity
>>> Money.npr("200000") * Purity(22).factor
Money(amount=Decimal('183333.3333333333333333333333'))
>>> str(Money.npr("183333.3333"))
'NPR 183333.33'
>>> Money.npr("1") < Money.npr("2")
True
>>> Weight(Decimal("11.6638038")).tola
Decimal('1')
>>> sorted([Purity(24), Purity(14), Purity(22)])
[Purity(karat=14), Purity(karat=22), Purity(karat=24)]
```

And the rejections:

```python
>>> Money(0.1)
Traceback (most recent call last):
  ...
TypeError: Money.amount must be a Decimal, got float
>>> Purity(19)
Traceback (most recent call last):
  ...
gold_pasal.errors.UnsupportedKaratError: karat must be one of 14, 18, 22, 24; got 19
>>> Money.npr("1") + Decimal("1")
Traceback (most recent call last):
  ...
AttributeError: 'decimal.Decimal' object has no attribute 'amount'
```

The last one is a type mismatch caught at runtime; pyright would have flagged it before you ran it.

## What each piece does

### frozen=True and order=True

`frozen` makes instances immutable and hashable, so a `Money` can be a set member or dict key. `order=True` generates `<`, `<=`, `>`, `>=` from the fields in order. With one field, `Money.npr("1") < Money.npr("2")` compares amounts, and `sorted` works on a list of purities.

### Validation in `__post_init__`

Each type checks its own rule once. `Weight` refuses `<= 0`. `Purity` refuses karat outside the four stamps. `Money` refuses anything that is not a `Decimal`, which is how a float is stopped at the door. The R1 pricing code checked these in `QuoteInput.__post_init__`; the next page deletes that class because the types now own the rules.

`type(x) is not Decimal` rather than `isinstance` because the field is already annotated `Decimal`; pyright in strict mode treats an `isinstance` that can only be true as an error. The runtime check exists for callers pyright cannot see, such as a value parsed from a file.

### Arithmetic dunders

| You write | Python calls | Defined here as |
| --- | --- | --- |
| `a + b` | `a.__add__(b)` | `Money + Money` |
| `a - b` | `a.__sub__(b)` | `Money - Money` |
| `a * k` | `a.__mul__(k)` | `Money * Decimal` or `Money * int` |
| `k * a` | `a.__rmul__(k)` | same, when the number is on the left |

`__rmul__ = __mul__` makes `Decimal("2") * money` work as well as `money * Decimal("2")`. There is no `Money * Money`; rupees squared is not a thing the shop sells. There is no `Money / Money` either; if you need a ratio, work on `.amount`.

### rounded() and `__str__`

`rounded()` returns a new `Money` quantized half up to paisa. `__str__` is what `print` and f-strings use, and it rounds for display. The stored `amount` stays at full precision. That is the R1 rule ("round a copy") made impossible to forget: you cannot print a `Money` unrounded, and you cannot accidentally store a rounded one unless you call `rounded()`.

### Derived values as properties

`Weight.tola` and `Purity.factor` are computed from the field each time. A property has no parentheses at the call site and cannot be assigned, which is right for a value that is always a function of the stored one.

## Test the types on their own

Create `tests/unit/domain/test_money.py` (create the folders; the next page explains the layout):

```python
from decimal import Decimal

import pytest

from gold_pasal.domain import Money


def test_money_adds_and_scales_at_full_precision() -> None:
    gold = Money(Decimal("200000")) * (Decimal(22) / Decimal(24))

    assert gold == Money(Decimal("183333.3333333333333333333333"))
    assert gold + Money.npr("1") == Money(Decimal("183334.3333333333333333333333"))


def test_rounded_is_half_up_on_a_copy() -> None:
    amount = Money.npr("2.345")

    assert amount.rounded() == Money.npr("2.35")
    assert amount == Money.npr("2.345")


def test_str_is_a_receipt_line() -> None:
    assert str(Money.npr("183333.3333")) == "NPR 183333.33"


def test_money_orders_by_amount() -> None:
    assert Money.npr("1") < Money.npr("2")
    assert max(Money.npr("5"), Money.npr("3")) == Money.npr("5")


def test_money_refuses_a_float() -> None:
    with pytest.raises(TypeError, match="Decimal"):
        Money(0.1)  # type: ignore[arg-type]


def test_money_is_frozen_and_hashable() -> None:
    assert len({Money.npr("1"), Money.npr("1.0"), Money.npr("2")}) == 2
```

The `# type: ignore[arg-type]` is deliberate and rare: the test passes a float on purpose to prove the runtime check, and the comment tells pyright and the reader why.

And `tests/unit/domain/test_weight_and_purity.py`:

```python
from decimal import Decimal

import pytest

from gold_pasal.domain import Purity, Weight
from gold_pasal.errors import NonPositiveAmountError, UnsupportedKaratError


def test_one_tola_in_grams_reads_as_one_tola() -> None:
    assert Weight(Decimal("11.6638038")).tola == Decimal("1")


@pytest.mark.parametrize("grams", [Decimal("0"), Decimal("-5")])
def test_weight_must_be_positive(grams: Decimal) -> None:
    with pytest.raises(NonPositiveAmountError, match="weight_grams"):
        Weight(grams)


@pytest.mark.parametrize(("karat", "factor"), [(24, Decimal(1)), (12, None)])
def test_purity_factor_or_rejection(karat: int, factor: Decimal | None) -> None:
    if factor is None:
        with pytest.raises(UnsupportedKaratError):
            Purity(karat)
    else:
        assert Purity(karat).factor == factor


def test_purities_order_by_karat() -> None:
    assert sorted([Purity(24), Purity(14), Purity(22)]) == [Purity(14), Purity(22), Purity(24)]
```

```bash
uv run pytest tests/unit/domain -q
```

```text
..........                                                               [100%]
10 passed in 0.02s
```

`Money.npr("1")` and `Money.npr("1.0")` land in the same set slot because `Decimal("1") == Decimal("1.0")` and equal Decimals hash equal. That is what you want for money.

## When to make a value object

Make one when a plain `Decimal` or `int` has a business rule attached (must be positive, must be one of four values), or when two plain values of the same Python type mean different things (grams and rupees are both `Decimal`). Do not make one for a value with no rule and no confusion risk; `name: str` on a catalog item is fine as a string.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `TypeError: unsupported operand type(s) for +: 'Money' and 'Decimal'` | Added a bare number to Money | Wrap it: `Money(Decimal(...))`, or multiply instead |
| `TypeError: '<' not supported between instances` | Forgot `order=True` | Add it to the decorator |
| `FrozenInstanceError` | Assigned to a field | Build a new value; these types do not change |
| pyright `reportUnnecessaryIsInstance` | Used `isinstance(self.amount, Decimal)` | Use `type(...) is not Decimal`, as in the listing |
| `ImportError: cannot import name 'NonPositiveAmountError'` | `errors.py` from R1 is missing | Copy it from [Exceptions and error handling](/releases/r1/02-exceptions-and-error-handling) |

## Practice

<LessonQuiz
  question="str(Money.npr('2.345')) prints NPR 2.35. What is Money.npr('2.345').amount afterwards?"
  a="Decimal('2.35')"
  b="Decimal('2.345')"
  c="Decimal('2.34')"
  d="It depends on the locale"
  correct="b"
>

`__str__` calls `rounded()`, which returns a new `Money`. The original amount is untouched. Rounding for display never changes the stored value.

</LessonQuiz>

Next: [Refactor pricing with a safety net](02-refactor-pricing-with-a-safety-net), which moves `quote()` onto these three types while the R1 tests watch.

<EvidenceCard
  command="uv run pytest tests/unit/domain -q"
  artifact="src/gold_pasal/domain.py with Money, Weight, Purity and ten green domain tests"
  invariant="A value object cannot exist with an amount, weight, or karat the shop does not accept"
/>
