---
id: r2-02
title: "Refactor pricing with a safety net"
release: r2
order: 2
prerequisites: [r2-01]
outcomes:
  - Change quote() internals in small steps while its tests stay green
  - Replace QuoteInput validation with the domain types
  - Update the tests that named a removed function, and nothing else
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="pricing.py has its own karat list, its own positivity checks, and a display() helper. domain.py now owns all three. Two copies of a rule drift."
  destination="quote() builds Money, Weight, and Purity and returns a QuoteResult of Money. Maya's total is unchanged, the CLI output is unchanged, and the suite is green after every step."
/>

# Refactor pricing with a safety net

A **refactor** changes how code is written without changing what it does. The proof that behavior held is a test suite that was green before and is green after. This page walks one real refactor, step by step, and shows what to do when a test must change because it named something that no longer exists.

## See the idea first

From `gold-pasal`, confirm the net is up before you touch anything:

```bash
uv run pytest -q
```

```text
....................                                                     [100%]
20 passed in 0.15s
```

If this is not green, stop and fix it first. A refactor on a red suite has no proof.

## The rule of small steps

Change one thing. Run the tests. Commit or move on. Never batch three changes and then debug which one broke Maya's total.

Each step below ends with the same command:

```bash
uv run pytest -q && uv run pyright
```

## Step 1: return Money instead of Decimal

In `src/gold_pasal/pricing.py`, change `QuoteResult` so its five fields are `Money`, and make `lines()` use `str()` on them:

```python
from gold_pasal.domain import Money, Purity, Weight


@dataclass(frozen=True)
class QuoteResult:
    gold_value: Money
    wastage: Money
    making_charge: Money
    vat: Money
    total: Money

    def lines(self) -> list[str]:
        """The five labelled lines the CLI prints, rounded for display."""
        return [
            f"Gold value: {self.gold_value}",
            f"Wastage: {self.wastage}",
            f"Making charge: {self.making_charge}",
            f"VAT: {self.vat}",
            f"Total: {self.total}",
        ]
```

`Money.__str__` already produces `NPR 183333.33`, so `display()` is no longer needed in `lines()`. Run the check. pyright now reports errors: `quote` still builds `QuoteResult` from Decimals, and `tests/test_quote.py` still calls `display`. That is the type checker doing the refactor's bookkeeping. Follow the errors.

## Step 2: compute in Money

Rewrite the helpers to take and return domain types:

```python
def gold_value(rate_per_tola: Money, weight: Weight, purity: Purity) -> Money:
    return rate_per_tola * weight.tola * purity.factor


def wastage_charge(gold: Money, wastage_percent: Decimal) -> Money:
    return gold * (wastage_percent / Decimal(100))


def making_charge(weight: Weight, rate_per_gram: Money) -> Money:
    return rate_per_gram * weight.grams


def vat_on(subtotal: Money) -> Money:
    return subtotal * VAT_RATE
```

Each helper's signature now says what it accepts. `gold_value(weight, rate, purity)` with the arguments swapped is a pyright error, not a wrong receipt. `purity_factor` and `display` are gone; `Purity.factor` and `Money.rounded` replaced them.

## Step 3: build the types in quote

`QuoteInput` existed to validate five Decimals. `Weight` and `Purity` now validate themselves, so delete `QuoteInput` and build the types directly:

```python
def quote(
    *,
    rate_per_tola: Decimal,
    weight_grams: Decimal,
    karat: int,
    wastage_percent: Decimal,
    making_charge_per_gram: Decimal,
) -> QuoteResult:
    """The R1 public seam: plain Decimals in, a QuoteResult out. Raises PricingError."""
    rate = Money(rate_per_tola)
    weight = Weight(weight_grams)
    purity = Purity(karat)
    per_gram = Money(making_charge_per_gram)
    if rate.amount <= 0:
        raise NonPositiveAmountError("rate_per_tola", rate.amount)
    if per_gram.amount <= 0:
        raise NonPositiveAmountError("making_charge_per_gram", per_gram.amount)
    if wastage_percent < 0:
        raise NonPositiveAmountError("wastage_percent", wastage_percent)

    gold = gold_value(rate, weight, purity)
    wastage = wastage_charge(gold, wastage_percent)
    making = making_charge(weight, per_gram)
    subtotal = gold + wastage + making
    vat = vat_on(subtotal)
    return QuoteResult(
        gold_value=gold, wastage=wastage, making_charge=making, vat=vat, total=subtotal + vat
    )
```

The signature did not change. R1's CLI, R1's tests, and the course's black-box check all call `quote` with the same five keywords and read the same field names. That is what "public seam" means: everything behind it moved; nothing in front of it noticed.

Two checks stay in `quote` because `Money` allows any amount: a rate of zero is a valid `Money` and an invalid rate. Rules about how a value is used belong at the use site; rules about what a value can be belong in the type.

Remove the now-unused imports (`ROUND_HALF_UP`, `UnsupportedKaratError`, `grams_to_tola`) and the `SUPPORTED_KARATS` and `PAISA` constants. `ruff check` will list each one.

## Step 4: update the tests that named display

Run the check. pytest fails to import `display` from `gold_pasal.pricing`. That test named an implementation detail that no longer exists; the behavior it checked (rounded value equals contract value) still does. Update `tests/test_quote.py`:

```python
from gold_pasal.domain import Money
from gold_pasal.errors import PricingError
from gold_pasal.pricing import QuoteResult, quote

...

def test_maya_one_tola_22k_matches_the_contract() -> None:
    result = maya_quote()

    assert result.gold_value.rounded() == Money.npr("183333.33")
    assert result.wastage.rounded() == Money.npr("3666.67")
    assert result.making_charge.rounded() == Money.npr("17495.71")
    assert result.vat.rounded() == Money.npr("26584.44")
    assert result.total.rounded() == Money.npr("231080.15")


def test_half_weight_halves_gold_value() -> None:
    result = maya_quote(weight_grams=Decimal("5.8319019"))

    assert result.gold_value.rounded() == Money.npr("91666.67")
```

Every expected number is the same. Only the way the test reads the result changed. The two `pytest.raises(PricingError, ...)` tests need no edit: `Weight` raises `NonPositiveAmountError` and `Purity` raises `UnsupportedKaratError`, both still `PricingError`, both with messages that still match `weight_grams` and `karat`.

```bash
uv run pytest -q && uv run pyright
```

```text
....................                                                     [100%]
20 passed in 0.16s
0 errors, 0 warnings, 0 informations
```

`tests/test_cli.py` did not change and still passes: the CLI output is byte-for-byte what it was, because `Money.__str__` reproduces the `display` rounding.

## Step 5: the CLI

Open `src/gold_pasal/cli.py`. It calls `quote` and prints `result.lines()`. Nothing to change. Run Maya's command to see it:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
```

```text
Gold value: NPR 183333.33
Wastage: NPR 3666.67
Making charge: NPR 17495.71
VAT: NPR 26584.44
Total: NPR 231080.15
```

## What a refactor may and may not change

| May change | May not change |
| --- | --- |
| private helpers, their names and signatures | the public function's name, keywords, and return field names |
| where validation lives | which inputs are rejected and with which exception type |
| how a number is stored | the number itself |
| tests that named a removed private helper | tests that state a business fact |

When a test must change, ask whether it was testing behavior or testing a name. `display(result.total) == Decimal("231080.15")` was testing a name. `result.total.rounded() == Money.npr("231080.15")` tests the same fact through the new public surface. If you find yourself changing the expected number, you are not refactoring.

::: tip Commit at every green
`git commit -m "Return Money from quote()"` after step 1 and 2, another after step 3 and 4. A reviewer can read two small diffs. If step 3 goes wrong, `git stash` gets you back to a green suite in one command.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `Total: NPR 231080.14` | A helper rounded before the sum | Helpers return full-precision `Money`; only `__str__` rounds |
| pyright `"Decimal" is not assignable to "Money"` | A call site still passes a bare Decimal | Wrap it: `Money(...)`, `Weight(...)`, `Purity(...)` |
| `ImportError: cannot import name 'display'` | The test names the removed helper | Use `.rounded()` and `Money.npr(...)` in the assert |
| `ruff` F401 unused import | Old imports left behind | Delete them |
| Zero weight no longer raises `PricingError` | `Weight` raises something else | `NonPositiveAmountError` must subclass `PricingError` |

## Practice

<LessonQuiz
  question="During a refactor, a test's expected total changes from 231080.15 to 231080.14 and the suite goes green. What happened?"
  a="A successful refactor; the tests prove it"
  b="Behavior changed; this is not a refactor and the new number is wrong"
  c="Decimal precision improved"
  d="Hypothesis needs to be installed"
  correct="b"
>

A refactor keeps every business fact. Changing an expected receipt amount to make a test pass hides a behavior change, and 231080.14 is the sum-of-rounded-lines bug the contract forbids.

</LessonQuiz>

Next: [Organize tests: conftest and markers](03-organize-tests-conftest-and-markers), because the suite is about to grow and `tests/` needs a shape.

<EvidenceCard
  command="uv run pytest -q && uv run pyright"
  artifact="pricing.py computing in Money, Weight, Purity; QuoteInput and display() removed; two commits"
  invariant="Maya's five lines and every rejection are unchanged through the refactor"
/>
