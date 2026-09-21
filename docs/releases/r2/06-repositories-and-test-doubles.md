---
id: r2-06
title: "Repositories and test doubles"
release: r2
order: 6
prerequisites: [r2-05]
outcomes:
  - Define CatalogItem, a CatalogRepository Protocol, and an InMemoryCatalog fake
  - Price a SKU through quote_sku without a database
  - Tell a fake from a stub from a mock, and use unittest.mock once
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="The tray knows RING-01 is 5.00 g of 22K. quote() still wants grams and karat typed on the command line. A SQL table this week would freeze a schema before R4 has designed one."
  destination="A CatalogRepository port returns a CatalogItem for a SKU. An in-memory fake satisfies it, tests price RING-01 through it, and the API in R3 will ask for the same port."
/>

# Repositories and test doubles

A **repository** is the object that loads and saves domain objects. Code that needs a catalog item asks the repository for it and does not know whether the answer came from a dict, a file, or PostgreSQL. The interface is a Protocol, the **port**. Each implementation is an **adapter**. The first adapter you write is a **fake**: a real, working, in-memory version for tests.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from typing import Protocol
>>> class WeightSource(Protocol):
...     def grams_for(self, sku: str) -> str: ...
...
>>> class DictWeights:
...     def __init__(self, table: dict[str, str]) -> None:
...         self.table = table
...     def grams_for(self, sku: str) -> str:
...         return self.table[sku]
...
>>> def describe(source: WeightSource, sku: str) -> str:
...     return f"{sku} weighs {source.grams_for(sku)} g"
...
>>> describe(DictWeights({"RING-01": "5.00"}), "RING-01")
'RING-01 weighs 5.00 g'
```

`describe` works against the Protocol. `DictWeights` is the fake. A Postgres-backed class with the same method would slot in without `describe` changing.

## The catalog module

Create `src/gold_pasal/catalog.py`:

```python
"""Catalog items and the repository port that loads them."""

from dataclasses import dataclass
from typing import Protocol

from gold_pasal.domain import Purity, Weight
from gold_pasal.errors import DuplicateSkuError, UnknownSkuError


@dataclass(frozen=True)
class CatalogItem:
    sku: str
    name: str
    metal: str
    weight: Weight
    purity: Purity


class CatalogRepository(Protocol):
    def add(self, item: CatalogItem) -> None: ...

    def get(self, sku: str) -> CatalogItem: ...

    def list_items(self, *, karat: int | None = None, limit: int = 20) -> list[CatalogItem]: ...


class InMemoryCatalog:
    """A dict-backed fake. Good enough until R4 gives the catalog a database."""

    def __init__(self, items: dict[str, CatalogItem] | None = None) -> None:
        self._items: dict[str, CatalogItem] = dict(items or {})

    def add(self, item: CatalogItem) -> None:
        if item.sku in self._items:
            raise DuplicateSkuError(item.sku)
        self._items[item.sku] = item

    def get(self, sku: str) -> CatalogItem:
        try:
            return self._items[sku]
        except KeyError:
            raise UnknownSkuError(sku) from None

    def list_items(self, *, karat: int | None = None, limit: int = 20) -> list[CatalogItem]:
        items = list(self._items.values())
        if karat is not None:
            items = [item for item in items if item.purity.karat == karat]
        return items[:limit]
```

Add the two exceptions to `src/gold_pasal/errors.py`:

```python
class CatalogError(Exception):
    """Base class for catalog lookups and writes."""


class UnknownSkuError(CatalogError, LookupError):
    def __init__(self, sku: str) -> None:
        super().__init__(f"no catalog item with sku {sku!r}")
        self.sku = sku


class DuplicateSkuError(CatalogError):
    def __init__(self, sku: str) -> None:
        super().__init__(f"catalog already has sku {sku!r}")
        self.sku = sku
```

### What to notice

`CatalogItem` holds `Weight` and `Purity`, not `Decimal` and `int`. An item in the catalog is valid by construction, the same guarantee the value objects gave `quote`.

The Protocol has three methods and no SQL. `list_items` takes keyword-only filters, because R3 will call it with `karat=22, limit=20` straight from a query string, and R4 will translate the same call into a `WHERE` clause.

`InMemoryCatalog` is a plain class, not a dataclass: it owns a mutable dict and its job is to change. `dict(items or {})` copies the input so a test's literal is not mutated behind its back.

`raise UnknownSkuError(sku) from None` converts the dict's `KeyError` into a domain error and hides the dict detail from the traceback. `UnknownSkuError` also inherits `LookupError`, so generic code catching lookups still works.

## Price a SKU through the port

Add to `src/gold_pasal/pricing.py`:

```python
from gold_pasal.catalog import CatalogRepository


def quote_sku(
    sku: str,
    catalog: CatalogRepository,
    *,
    rate_per_tola: Decimal,
    wastage_percent: Decimal,
    making_charge_per_gram: Decimal,
) -> QuoteResult:
    """Look the weight and purity up by SKU, then price. Raises UnknownSkuError."""
    item = catalog.get(sku)
    return price(
        rate_per_tola=Money(rate_per_tola),
        weight=item.weight,
        purity=item.purity,
        wastage_percent=wastage_percent,
        making_policy=PerGramMakingCharge(Money(making_charge_per_gram)),
    )
```

`quote_sku` takes the repository as a parameter. It does not build one, import a global one, or know the fake exists. Whoever calls it decides where catalog data comes from. This is the same dependency inversion as the making-charge policy, applied to data instead of a rule.

`pricing` imports `catalog`; `catalog` imports `domain` and `errors`. Nothing imports upward, so there is no circular import.

## Fixtures for the catalog

Extend `tests/conftest.py`:

```python
from gold_pasal.catalog import CatalogItem, InMemoryCatalog
from gold_pasal.domain import Purity, Weight


@pytest.fixture
def maya_ring() -> CatalogItem:
    return CatalogItem(
        sku="CHAIN-02",
        name="Tilhari Necklace",
        metal="gold",
        weight=Weight(MAYA_GRAMS),
        purity=Purity(22),
    )


@pytest.fixture
def catalog(maya_ring: CatalogItem) -> InMemoryCatalog:
    ring = CatalogItem("RING-01", "Sajilo 22K Ring", "gold", Weight(Decimal("5.00")), Purity(22))
    return InMemoryCatalog({ring.sku: ring, maya_ring.sku: maya_ring})
```

`catalog` asks for `maya_ring` by naming it as a parameter. pytest builds the ring first, then the catalog. Every test gets a fresh two-item catalog, so a test that adds a bangle cannot affect the next one.

## Test through the fake

Create `tests/unit/catalog/test_in_memory_catalog.py`:

```python
from decimal import Decimal

import pytest

from gold_pasal.catalog import CatalogItem, InMemoryCatalog
from gold_pasal.domain import Purity, Weight
from gold_pasal.errors import DuplicateSkuError, UnknownSkuError
from gold_pasal.pricing import quote, quote_sku


def test_ring_01_is_priced_from_the_weight_the_fake_returns(catalog: InMemoryCatalog) -> None:
    by_sku = quote_sku(
        "RING-01",
        catalog,
        rate_per_tola=Decimal("200000"),
        wastage_percent=Decimal("2"),
        making_charge_per_gram=Decimal("1500"),
    )
    direct = quote(
        rate_per_tola=Decimal("200000"),
        weight_grams=Decimal("5.00"),
        karat=22,
        wastage_percent=Decimal("2"),
        making_charge_per_gram=Decimal("1500"),
    )

    assert by_sku.gold_value == direct.gold_value


def test_unknown_sku_fails_before_any_arithmetic(catalog: InMemoryCatalog) -> None:
    with pytest.raises(UnknownSkuError, match="CHAIN-99"):
        catalog.get("CHAIN-99")


def test_list_filters_by_karat_and_respects_limit(catalog: InMemoryCatalog) -> None:
    bangle = CatalogItem("BANGLE-09", "Festival Bangle", "gold", Weight(Decimal("8.40")), Purity(18))
    catalog.add(bangle)

    assert [item.sku for item in catalog.list_items(karat=18)] == ["BANGLE-09"]
    assert len(catalog.list_items(limit=2)) == 2


def test_duplicate_sku_is_rejected(catalog: InMemoryCatalog, maya_ring: CatalogItem) -> None:
    with pytest.raises(DuplicateSkuError):
        catalog.add(maya_ring)
```

```bash
uv run pytest tests/unit/catalog -q
```

```text
....                                                                     [100%]
4 passed in 0.02s
```

The first test is the contract of the port: pricing by SKU must equal pricing by the SKU's known weight. If the fake ever returned the wrong item, or `quote_sku` ignored the lookup, this is the test that fails.

## Fakes, stubs, and mocks

These three are all **test doubles**, objects that stand in for a real dependency. They answer different questions.

| Double | What it is | Ask it |
| --- | --- | --- |
| Fake | a working, simplified implementation (`InMemoryCatalog`) | does my code produce the right result? |
| Stub | returns canned answers, no logic | what does my code do when the dependency says X? |
| Mock | records calls and lets you assert on them | did my code call the dependency correctly? |

Prefer the fake. It exercises real behavior (filtering, duplicate detection) and the tests read like production code. Reach for a mock only when the call itself is the fact you are proving: that a payment was attempted once, that an email was not sent twice.

### A mock, once

`unittest.mock` is in the standard library. `create_autospec` builds a mock that has exactly the Protocol's methods and nothing else. Add two imports at the top of the same test file (ruff rejects imports below the first function):

```python
from unittest.mock import create_autospec

from gold_pasal.catalog import CatalogItem, CatalogRepository, InMemoryCatalog
```

Then append the test:

```python
def test_a_mock_records_that_the_lookup_happened_once(maya_ring: CatalogItem) -> None:
    repo = create_autospec(CatalogRepository, instance=True)
    repo.get.return_value = maya_ring

    quote_sku(
        "CHAIN-02",
        repo,
        rate_per_tola=Decimal("200000"),
        wastage_percent=Decimal("2"),
        making_charge_per_gram=Decimal("1500"),
    )

    repo.get.assert_called_once_with("CHAIN-02")
```

`repo.get.return_value = maya_ring` is the stub part: whatever SKU is asked for, hand back Maya's ring. `assert_called_once_with("CHAIN-02")` is the mock part: `quote_sku` looked up exactly the SKU it was given, exactly once. If it had called `get` twice, or with the wrong string, the assertion fails with `expected call not found`.

`instance=True` makes the mock behave like an object, not a class. Without `create_autospec`, a bare `Mock()` accepts any attribute (`repo.nonsense()` returns another mock), so a typo in a method name passes silently. Autospec catches it with `AttributeError`.

::: warning Mocks that mirror the implementation
A test full of `assert_called_with` for every internal step breaks on every refactor and proves nothing about the receipt. One mock per fact worth asserting. The fake carries the rest.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `ImportError: cannot import name 'CatalogRepository'` from `pricing` | Circular import | `pricing` imports `catalog`, never the reverse |
| pyright `"InMemoryCatalog" is not assignable to "CatalogRepository"` | Method signature differs from the Protocol | Match `list_items(self, *, karat=..., limit=...)` exactly, including keyword-only |
| `KeyError: 'CHAIN-99'` instead of `UnknownSkuError` | Missing `try`/`except` in `get` | Convert with `raise UnknownSkuError(sku) from None` |
| `AttributeError: Mock object has no attribute 'nonsense'` | Autospec caught a method that is not on the Protocol | Good; fix the name |
| A test sees a bangle it did not add | Shared mutable fixture | `catalog` must be function-scoped and copy its dict |

## Practice

<LessonQuiz
  question="You want to prove that quote_sku prices RING-01 at the same gold value as quote(weight_grams=5.00). Which double?"
  a="A Mock with get.return_value, asserting call_count"
  b="InMemoryCatalog holding RING-01 at 5.00 g, comparing the two results"
  c="A real PostgreSQL container"
  d="No double; hard-code 5.00 inside quote_sku"
  correct="b"
>

The fact under test is a result, not a call. A fake produces the real result through real code. A mock would prove `get` was called, which is not the question. Postgres arrives in R4 and would slow this test a thousandfold for no extra proof.

</LessonQuiz>

Next: [Logging and auditable decisions](07-logging-and-auditable-decisions).

<EvidenceCard
  command="uv run pytest tests/unit/catalog -q"
  artifact="catalog.py with CatalogItem, CatalogRepository, InMemoryCatalog; quote_sku; five tests including one autospec mock"
  invariant="Pricing by SKU equals pricing by that SKU's weight; unknown SKUs fail before arithmetic"
/>
