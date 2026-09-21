---
id: r2-05
title: "Protocols and the strategy pattern"
release: r2
order: 5
prerequisites: [r2-04]
outcomes:
  - Define a MakingChargePolicy Protocol and two implementations
  - Split quote() into a public wrapper and a price() core that takes a policy
  - Prove a flat fee changes only the making line
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="Patan charges NPR per gram. A festival stall wants a flat NPR 500 making fee. An if festival: inside quote() will grow a second branch next month and a third after that."
  destination="Making charge is an object with a charge() method. The CLI still uses per-gram by default. A test swaps in a flat fee without touching gold_value."
/>

# Protocols and the strategy pattern

A **strategy** is a piece of behavior you can swap without changing the code that uses it. In Python you describe the swappable shape with a **Protocol** (from [R1](/releases/r1/04-type-hints-protocols-and-pyright)): any object with the right method fits, no inheritance required. This page applies it to the making charge.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from decimal import Decimal
>>> from typing import Protocol
>>> from gold_pasal.domain import Money, Weight
>>> class MakingChargePolicy(Protocol):
...     def charge(self, weight: Weight) -> Money: ...
...
>>> class FlatFee:
...     def __init__(self, fee: Money) -> None:
...         self.fee = fee
...     def charge(self, weight: Weight) -> Money:
...         return self.fee
...
>>> def making_line(policy: MakingChargePolicy, weight: Weight) -> Money:
...     return policy.charge(weight)
...
>>> making_line(FlatFee(Money.npr("500")), Weight(Decimal("5.00")))
Money(amount=Decimal('500'))
```

`FlatFee` never mentions `MakingChargePolicy`. It fits because it has `charge(self, weight: Weight) -> Money`. `making_line` does not know or care which policy it received.

## Define the policy and two implementations

In `src/gold_pasal/pricing.py`, add above `QuoteResult`:

```python
from typing import Protocol


class MakingChargePolicy(Protocol):
    """Any object that can turn a weight into a making charge."""

    def charge(self, weight: Weight) -> Money: ...


@dataclass(frozen=True)
class PerGramMakingCharge:
    rate_per_gram: Money

    def charge(self, weight: Weight) -> Money:
        return self.rate_per_gram * weight.grams


@dataclass(frozen=True)
class FlatMakingCharge:
    fee: Money

    def charge(self, weight: Weight) -> Money:
        return self.fee
```

Both implementations are frozen dataclasses: a policy is a value (per gram at NPR 1500) and two policies with the same rate are the same policy. Delete the old `making_charge(weight, rate_per_gram)` function; `PerGramMakingCharge.charge` is that function with its rate attached.

## Split quote into a wrapper and a core

`quote` currently does two jobs: turn five plain values into domain types, and price them. Give the second job its own function that takes a policy:

```python
def price(
    *,
    rate_per_tola: Money,
    weight: Weight,
    purity: Purity,
    wastage_percent: Decimal,
    making_policy: MakingChargePolicy,
) -> QuoteResult:
    """Price one ornament from validated value objects."""
    if rate_per_tola.amount <= 0:
        raise NonPositiveAmountError("rate_per_tola", rate_per_tola.amount)
    if wastage_percent < 0:
        raise NonPositiveAmountError("wastage_percent", wastage_percent)
    gold = gold_value(rate_per_tola, weight, purity)
    wastage = wastage_charge(gold, wastage_percent)
    making = making_policy.charge(weight)
    subtotal = gold + wastage + making
    vat = vat_on(subtotal)
    return QuoteResult(
        gold_value=gold, wastage=wastage, making_charge=making, vat=vat, total=subtotal + vat
    )


def quote(
    *,
    rate_per_tola: Decimal,
    weight_grams: Decimal,
    karat: int,
    wastage_percent: Decimal,
    making_charge_per_gram: Decimal,
    making_policy: MakingChargePolicy | None = None,
) -> QuoteResult:
    """The R1 public seam: plain Decimals in, a QuoteResult out. Raises PricingError."""
    if making_charge_per_gram <= 0:
        raise NonPositiveAmountError("making_charge_per_gram", making_charge_per_gram)
    policy = making_policy or PerGramMakingCharge(Money(making_charge_per_gram))
    return price(
        rate_per_tola=Money(rate_per_tola),
        weight=Weight(weight_grams),
        purity=Purity(karat),
        wastage_percent=wastage_percent,
        making_policy=policy,
    )
```

`quote` keeps its five keywords and gains an optional sixth. Omit it and you get per-gram from `--making-charge-per-gram`, exactly as before; the CLI does not change. Pass a policy and it wins. `price` is the core the next page and R3 call directly, with value objects they already hold.

```bash
uv run pytest -q && uv run pyright
```

Green and zero errors. Nothing that already existed changed its answer.

## Test the swap

Create `tests/unit/pricing/test_making_policies.py`:

```python
from decimal import Decimal

from gold_pasal.domain import Money, Weight
from gold_pasal.pricing import (
    FlatMakingCharge,
    MakingChargePolicy,
    PerGramMakingCharge,
    QuoteResult,
    quote,
)

FIVE_GRAMS = Weight(Decimal("5.00"))


def five_gram_quote(making_policy: MakingChargePolicy | None = None) -> QuoteResult:
    return quote(
        rate_per_tola=Decimal("200000"),
        weight_grams=Decimal("5.00"),
        karat=22,
        wastage_percent=Decimal("2"),
        making_charge_per_gram=Decimal("1500"),
        making_policy=making_policy,
    )


def test_per_gram_is_grams_times_rate() -> None:
    policy: MakingChargePolicy = PerGramMakingCharge(Money.npr("1500"))

    assert policy.charge(FIVE_GRAMS) == Money.npr("7500.00")


def test_flat_fee_ignores_weight() -> None:
    policy: MakingChargePolicy = FlatMakingCharge(Money.npr("500"))

    assert policy.charge(FIVE_GRAMS) == Money.npr("500")
    assert policy.charge(Weight(Decimal("11.6638038"))) == Money.npr("500")


def test_swapping_the_policy_changes_only_the_making_line() -> None:
    per_gram = five_gram_quote()
    flat = five_gram_quote(FlatMakingCharge(Money.npr("500")))

    assert per_gram.making_charge == Money.npr("7500.00")
    assert flat.making_charge == Money.npr("500")
    assert per_gram.gold_value == flat.gold_value
```

```bash
uv run pytest tests/unit/pricing/test_making_policies.py -q
```

```text
...                                                                      [100%]
3 passed in 0.02s
```

`policy: MakingChargePolicy = PerGramMakingCharge(...)` is a pyright check disguised as a test: if `PerGramMakingCharge` ever loses its `charge` method or changes the signature, the assignment stops type-checking.

The third test is the point of the page. Only the making line moved. Gold value, which never touched the policy, is identical.

## Why not a subclass or an if

**An `if`** puts the festival rule inside `price`, where every future rule also lands. The function grows a branch per stall and the tests for gold value start depending on making-charge details.

**A base class** (`class MakingCharge: def charge(...)`) works, but forces every policy to inherit from it. A policy written in another module, or a test double, has to import and subclass. A Protocol asks only for the method.

**A Protocol plus a default** keeps the common path (per gram) one line long and puts each rule in its own small object with its own tests. This is **dependency inversion**: `price` depends on a shape it defines, and the concrete policies depend on that shape, not the other way round.

::: tip Where the choice is made
Which policy to use is decided at the edge: the CLI builds per-gram from a flag; a festival config would build `FlatMakingCharge`; a test builds whatever it needs. `price` never reads an environment variable or a config file. Do not write `if os.getenv("FESTIVAL")` in `pricing.py`.
:::

### runtime_checkable

By default a Protocol is only for pyright. If you need `isinstance(obj, MakingChargePolicy)` at runtime, decorate it:

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class MakingChargePolicy(Protocol):
    def charge(self, weight: Weight) -> Money: ...
```

`isinstance` then checks that the method exists, not its signature. The shop does not need it yet; know that it exists.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| pyright `"FlatMakingCharge" is not assignable to "MakingChargePolicy"` | Method name or signature differs | Match `charge(self, weight: Weight) -> Money` exactly |
| Maya's making line became `500` | The CLI passed the flat policy | The CLI passes no policy; the default is per-gram |
| Gold value changed after adding the policy | `price` routed gold through the policy | Only the making line calls `making_policy.charge` |
| `TypeError: price() got an unexpected keyword argument 'making_charge_per_gram'` | Called the core with the wrapper's arguments | `quote` takes Decimals; `price` takes value objects and a policy |
| `NameError: making_charge` | Deleted the helper but a caller remained | Use `PerGramMakingCharge(...).charge(weight)` |

## Practice

<LessonQuiz
  question="A new stall wants making charge as 3% of gold value. Where does that rule go?"
  a="An elif inside price()"
  b="A new class with charge(self, weight) that also needs the gold value, so the Protocol must change"
  c="A new frozen dataclass implementing charge(); if it needs gold value, price() passes it and the Protocol gains that parameter for all policies"
  d="A global setting read inside gold_value()"
  correct="c"
>

A new rule is a new policy object. If the rule needs an input the Protocol does not provide, change the Protocol once and every implementation with it; that is a deliberate, visible change. Branches inside `price` and globals inside `gold_value` are the two things the pattern exists to avoid.

</LessonQuiz>

Next: [Repositories and test doubles](06-repositories-and-test-doubles), where the same Protocol idea hides where a SKU's weight comes from.

<EvidenceCard
  command="uv run pytest tests/unit/pricing/test_making_policies.py -q"
  artifact="MakingChargePolicy Protocol, PerGramMakingCharge, FlatMakingCharge, price() core"
  invariant="A new making rule is a new object; gold value does not change when the policy does"
/>
