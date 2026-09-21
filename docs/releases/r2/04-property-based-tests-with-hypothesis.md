---
id: r2-04
title: "Property-based tests with Hypothesis"
release: r2
order: 4
prerequisites: [r2-03]
outcomes:
  - Add Hypothesis as a dev dependency and write a @given test
  - Choose strategies for grams, rates, and karat
  - Read a falsifying example and decide whether the code or the property is wrong
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="Staff report a 22K ring showing less gold value than an 18K ring. Maya's total is still green. Example tests only check the examples you thought of."
  destination="Three invariants of the pricing formula run against hundreds of generated inputs on every verify, and you know what to do when one fails."
/>

# Property-based tests with Hypothesis

An **example test** says: for these inputs, expect this output. A **property test** says: for any inputs in this range, this relationship holds. **Hypothesis** is the library that generates the inputs, runs your test hundreds of times, and, when it finds a failure, shrinks it to the smallest case that still fails.

## See the idea first

From `gold-pasal`:

```bash
uv add --group dev hypothesis
```

Then in `uv run python`:

```python
>>> from hypothesis import given, strategies as st
>>> @given(st.integers(min_value=0))
... def never_negative(n: int) -> None:
...     assert n >= 0
...
>>> never_negative()
>>>
```

No output is success: Hypothesis ran `never_negative` one hundred times with different integers and every `assert` held. Change `min_value=0` to `min_value=-1` and run it again to see a failure.

## An invariant of the pricing formula

The staff report is a property: with rate and weight fixed, gold value must not fall as karat rises. Write it in `tests/unit/pricing/test_invariants.py`:

```python
from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from gold_pasal.pricing import QuoteResult, quote

grams = st.decimals(min_value=Decimal("0.01"), max_value=Decimal("500"), places=4)
rates = st.decimals(min_value=Decimal("1000"), max_value=Decimal("500000"), places=0)


def maya_like(*, rate: Decimal, weight: Decimal, karat: int) -> QuoteResult:
    return quote(
        rate_per_tola=rate,
        weight_grams=weight,
        karat=karat,
        wastage_percent=Decimal("2"),
        making_charge_per_gram=Decimal("1500"),
    )


@given(rate=rates, weight=grams)
def test_gold_value_never_falls_as_karat_rises(rate: Decimal, weight: Decimal) -> None:
    values = [maya_like(rate=rate, weight=weight, karat=k).gold_value for k in (14, 18, 22, 24)]

    assert values == sorted(values)
```

```bash
uv run pytest tests/unit/pricing/test_invariants.py -q
```

```text
.                                                                        [100%]
1 passed in 0.08s
```

One dot, one hundred runs. `values == sorted(values)` is the whole invariant: the list is already in non-decreasing order. `Money` supports `<` because of `order=True`, so `sorted` works on it directly.

### Strategies

A **strategy** describes the values Hypothesis may generate. `st.decimals(min_value, max_value, places)` gives Decimals in a range with a fixed number of decimal places. Other ones the shop uses:

| Strategy | Generates |
| --- | --- |
| `st.integers(min_value=1, max_value=100)` | ints in a range |
| `st.decimals(..., places=4)` | Decimals with up to four places, never NaN or infinity |
| `st.sampled_from([14, 18, 22, 24])` | one of the given values |
| `st.text(min_size=1)` | strings |
| `st.lists(st.integers(), max_size=5)` | lists of another strategy |
| `st.builds(Weight, grams)` | call a constructor with generated arguments |

Bound every numeric strategy to the range the business allows. A rate of `Decimal("1E+28")` is not a bug in the formula; it is a bug in the test.

## Two more properties

Append to the same file:

```python
from gold_pasal.domain import Money

karats = st.sampled_from([14, 18, 22, 24])


@given(rate=rates, weight=grams, karat=karats)
def test_doubling_the_weight_doubles_the_gold_value(
    rate: Decimal, weight: Decimal, karat: int
) -> None:
    single = maya_like(rate=rate, weight=weight, karat=karat).gold_value
    double = maya_like(rate=rate, weight=weight * 2, karat=karat).gold_value

    assert (double - single * 2).rounded() == Money.npr("0.00")


@given(rate=rates, weight=grams, karat=karats)
def test_total_is_subtotal_times_one_point_thirteen(
    rate: Decimal, weight: Decimal, karat: int
) -> None:
    result = maya_like(rate=rate, weight=weight, karat=karat)
    subtotal = result.gold_value + result.wastage + result.making_charge

    assert result.total == subtotal * Decimal("1.13")
```

Run the file:

```text
..F                                                                      [100%]
=================================== FAILURES ===================================
_______________ test_total_is_subtotal_times_one_point_thirteen ________________
...
>       assert result.total == subtotal * Decimal("1.13")
E       AssertionError: assert Money(amount=...48011676946')) == Money(amount=...48011676945'))
E         Drill down into differing attribute amount:
E           amount: Decimal('64.68034042290731948011676946') != Decimal('64.68034042290731948011676945')
E       Failing test case: test_total_is_subtotal_times_one_point_thirteen(
E           rate=Decimal('48301'),
E           weight=Decimal('0.0100'),
E       )
1 failed, 2 passed in 0.25s
```

Hypothesis found inputs where `subtotal + subtotal × 0.13` and `subtotal × 1.13` differ in the twenty-eighth digit. Both are correct Decimal arithmetic at 28 significant digits; they round the last digit differently.

## Read a falsifying example

Every Hypothesis failure ends with `Failing test case:` and the exact inputs. Ask two questions:

1. **Is the code wrong?** Would a shopper see a wrong receipt? Here, no: both amounts round to `NPR 64.68`. The contract computes `vat = subtotal × 0.13` then `total = subtotal + vat`, and the code does exactly that.
2. **Is the property wrong?** Yes. It asserted a mathematical identity that Decimal arithmetic does not promise at the last digit.

Fix the property so it states what the contract states:

```python
@given(rate=rates, weight=grams, karat=karats)
def test_total_is_subtotal_plus_thirteen_percent(
    rate: Decimal, weight: Decimal, karat: int
) -> None:
    result = maya_like(rate=rate, weight=weight, karat=karat)
    subtotal = result.gold_value + result.wastage + result.making_charge

    assert result.vat == subtotal * Decimal("0.13")
    assert result.total == subtotal + result.vat
    assert result.total > subtotal
```

```text
...                                                                      [100%]
3 passed in 0.22s
```

The doubling test already used this discipline: it compares `.rounded()` values, because "double the grams, double the gold" is true to the paisa and not necessarily to the twenty-eighth digit.

::: tip When Hypothesis finds a real bug
Add the failing inputs as a permanent example so the bug cannot return quietly:

```python
from hypothesis import example

@example(rate=Decimal("48301"), weight=Decimal("0.0100"), karat=24)
@given(rate=rates, weight=grams, karat=karats)
def test_...
```

`@example` runs that exact case every time, before the random ones.
:::

## Settings and the database

Hypothesis remembers failing examples in a `.hypothesis/` folder next to your tests and replays them first on the next run. Add that folder to `.gitignore`.

Control the number of runs per test with `@settings`:

```python
from hypothesis import settings

@settings(max_examples=200)
@given(rate=rates, weight=grams, karat=karats)
def test_total_is_subtotal_plus_thirteen_percent(...) -> None:
```

The default is 100. Raise it for a property that guards money; lower it if a test gets slow. `uv run pytest tests/unit --durations=3` shows the three invariant tests at the top, each around a tenth of a second. That is the cost of a few hundred quotes and it is worth paying on every verify.

## What makes a good property

| Kind | Example from this desk |
| --- | --- |
| Ordering | gold value is non-decreasing in karat |
| Linearity | double the grams, double the gold |
| Composition | total equals subtotal plus VAT |
| Round-trip | `tola_to_grams(grams_to_tola(g)) == g` (try it in `tests/test_units.py`) |
| Rejection | every karat outside the four raises `PricingError` |

Properties do not replace example tests. Maya's `231080.15` is still the one number a reviewer can check by hand. Properties catch the inputs nobody wrote an example for.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError: hypothesis` | Not installed in the dev group | `uv add --group dev hypothesis` |
| `Unsatisfiable` or `FailedHealthCheck: filter too much` | `assume(...)` or a filter rejects most inputs | Narrow the strategy instead of filtering |
| `Flaky: ... passed on rerun` | The test depends on state between runs | Build fresh objects inside the test |
| A property fails only in the last digit | Identity assumed on full-precision Decimals | Compare `.rounded()`, or assert the formula as computed |
| `InvalidArgument: Cannot convert min_value` | Passed a float or str to `st.decimals` | Pass `Decimal("...")` |
| pyright `reportUnknownParameterType` on the test | Parameters unannotated | Annotate every generated argument |

## Practice

<LessonQuiz
  question="Hypothesis reports Failing test case: rate=Decimal('48301'), weight=Decimal('0.0100'). What is the first thing to do?"
  a="Increase max_examples so the failure disappears"
  b="Decide whether the code or the property is wrong by checking what a shopper would see"
  c="Delete the test; Decimal is unreliable"
  d="Add a try/except around the assert"
  correct="b"
>

A falsifying example is evidence. Sometimes the code is wrong and you add `@example` to pin the fix. Sometimes the property claimed more than the contract does, as here, and you restate it. Hiding the failure is never the answer.

</LessonQuiz>

Next: [Protocols and the strategy pattern](05-protocols-and-the-strategy-pattern).

<EvidenceCard
  command="uv run pytest tests/unit/pricing/test_invariants.py -q"
  artifact="three Hypothesis properties: karat ordering, weight linearity, total composition"
  invariant="With rate and weight fixed, gold value never falls as karat rises, for any rate and weight in range"
/>
