---
id: r1-03
title: "Classes, dataclasses, and enums"
release: r1
order: 3
prerequisites: [r1-02]
outcomes:
  - Define a class with __init__, methods, and __repr__
  - Replace a tuple row with a frozen dataclass that validates itself
  - Model supported karat as an IntEnum
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="A tray row is a bare tuple. Nothing says which position is grams and which is karat, row[1] is meaningless to a reader, and a 16K row can be built without anyone noticing until pricing time."
  destination="An Ornament dataclass names every field, rejects bad karat when it is built, and a Karat enum lists exactly the four stamps the shop sells."
/>

# Classes, dataclasses, and enums

A **class** bundles data and the functions that work on it. An **object** (instance) is one concrete thing built from a class: this ring, that necklace. You have used classes since page one: `Decimal`, `str`, and `list` are classes, and `Decimal("5.00")` builds an instance.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from dataclasses import dataclass
>>> from decimal import Decimal
>>> @dataclass(frozen=True)
... class Ornament:
...     sku: str
...     grams: Decimal
...     karat: int
...
>>> ring = Ornament("RING-01", Decimal("5.00"), 22)
>>> ring
Ornament(sku='RING-01', grams=Decimal('5.00'), karat=22)
>>> ring.karat
22
```

Three lines of field names replaced `row[2]` with `ring.karat`. The rest of this page is what the `@dataclass` line did for you, and when to write it by hand.

## Classes by hand

```python
class Ornament:
    def __init__(self, sku: str, grams: Decimal, karat: int) -> None:
        self.sku = sku
        self.grams = grams
        self.karat = karat

    def purity(self) -> Decimal:
        return Decimal(self.karat) / Decimal(24)
```

`__init__` runs when you call `Ornament(...)`. `self` is the instance being built; assigning to `self.sku` stores an **attribute** on it. `purity` is a **method**: a function defined in the class that receives the instance as `self`.

```python
>>> ring = Ornament("RING-01", Decimal("5.00"), 22)
>>> ring.sku
'RING-01'
>>> ring.purity()
Decimal('0.9166666666666666666666666667')
```

You never pass `self` yourself. `ring.purity()` is Python calling `Ornament.purity(ring)`.

### `__repr__` and `__eq__`

Without help, an instance prints as `<__main__.Ornament object at 0x...>` and two identical ornaments compare unequal:

```python
>>> Ornament("RING-01", Decimal("5.00"), 22) == Ornament("RING-01", Decimal("5.00"), 22)
False
```

Methods with double underscores (**dunder** methods) customise that. `__repr__` controls the echo; `__eq__` controls `==`:

```python
    def __repr__(self) -> str:
        return f"Ornament(sku={self.sku!r}, grams={self.grams}, karat={self.karat})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Ornament):
            return NotImplemented
        return (self.sku, self.grams, self.karat) == (other.sku, other.grams, other.karat)
```

That is a lot of typing for "a thing with three fields". Dataclasses write it for you.

## Dataclasses

`@dataclass` is a **decorator** (a function that modifies the class below it; the [decorators page](05-generators-files-and-decorators) covers writing your own). It reads the annotated fields and generates `__init__`, `__repr__`, and `__eq__`:

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Ornament:
    sku: str
    grams: Decimal
    karat: int = 22
    tags: list[str] = field(default_factory=list)
```

```python
>>> ring = Ornament("RING-01", Decimal("5.00"))
>>> ring
Ornament(sku='RING-01', grams=Decimal('5.00'), karat=22, tags=[])
>>> ring == Ornament("RING-01", Decimal("5.00"))
True
```

### Defaults and default_factory

`karat: int = 22` is a plain default. A list default must use `field(default_factory=list)` so each instance gets its own list; the [Functions](/releases/r0/06-functions) warning about mutable defaults applies here too. Fields with defaults come after fields without.

### frozen=True

A frozen dataclass cannot be changed after it is built:

```python
>>> ring.karat = 24
Traceback (most recent call last):
  ...
dataclasses.FrozenInstanceError: cannot assign to field 'karat'
```

That is what you want for a quote input or result: once Maya's numbers are captured, nobody can nudge the total. Frozen instances are also hashable, so they can be dict keys and set members. To "change" one, build a new one:

```python
>>> from dataclasses import replace, asdict
>>> replace(ring, karat=18)
Ornament(sku='RING-01', grams=Decimal('5.00'), karat=18, tags=[])
>>> asdict(ring)
{'sku': 'RING-01', 'grams': Decimal('5.00'), 'karat': 22, 'tags': []}
```

### Validate in `__post_init__`

`__post_init__` runs right after the generated `__init__`. It is the place to reject impossible values:

```python
from gold_pasal.errors import NonPositiveAmountError, UnsupportedKaratError

SUPPORTED_KARATS = (14, 18, 22, 24)


@dataclass(frozen=True)
class Ornament:
    sku: str
    grams: Decimal
    karat: int = 22

    def __post_init__(self) -> None:
        if self.karat not in SUPPORTED_KARATS:
            raise UnsupportedKaratError(self.karat)
        if self.grams <= 0:
            raise NonPositiveAmountError("grams", self.grams)
```

```python
>>> Ornament("BANGLE-09", Decimal("8.40"), 16)
Traceback (most recent call last):
  ...
gold_pasal.errors.UnsupportedKaratError: karat must be one of 14, 18, 22, 24; got 16
```

The bad row now fails where it is created, not three functions later. Every `Ornament` that exists is a valid one, and the pricing code can stop re-checking.

### Methods, properties, and classmethods

A dataclass is still a class. Add methods as usual:

```python
from gold_pasal.units import GRAMS_PER_TOLA


@dataclass(frozen=True)
class Ornament:
    sku: str
    grams: Decimal
    karat: int = 22

    @property
    def tola(self) -> Decimal:
        return self.grams / GRAMS_PER_TOLA

    @classmethod
    def one_tola(cls, sku: str, karat: int = 22) -> "Ornament":
        return cls(sku, GRAMS_PER_TOLA, karat)
```

```python
>>> Ornament("RING-01", Decimal("5.00")).tola
Decimal('0.4286766209150397402946712804')
>>> Ornament.one_tola("CHAIN-02")
Ornament(sku='CHAIN-02', grams=Decimal('11.6638038'), karat=22)
```

`@property` makes a method read like an attribute (`ring.tola`, no parentheses) for a value derived from the fields. `@classmethod` receives the class as `cls` instead of an instance; use it for alternative constructors with a descriptive name.

### A class that holds other objects

```python
@dataclass
class Tray:
    items: list[Ornament] = field(default_factory=list)

    def add(self, item: Ornament) -> None:
        self.items.append(item)

    def total_grams(self) -> Decimal:
        return sum((item.grams for item in self.items), Decimal("0"))
```

```python
>>> tray = Tray()
>>> tray.add(Ornament("RING-01", Decimal("5.00")))
>>> tray.add(Ornament.one_tola("CHAIN-02"))
>>> len(tray.items), tray.total_grams()
(2, Decimal('16.6638038'))
```

`Tray` is not frozen because adding to it is its job. Prefer this **composition** (a Tray has Ornaments) over inheritance (a Tray is a list) when you want to control which operations exist.

## Enums

An **enum** is a class whose instances are a fixed set of named constants. The shop sells four karats and no others:

```python
from enum import IntEnum


class Karat(IntEnum):
    K14 = 14
    K18 = 18
    K22 = 22
    K24 = 24
```

```python
>>> Karat(22)
<Karat.K22: 22>
>>> Karat(22).name, Karat(22).value
('K22', 22)
>>> Karat.K22 == 22
True
>>> [k.value for k in Karat]
[14, 18, 22, 24]
>>> Karat(19)
Traceback (most recent call last):
  ...
ValueError: 19 is not a valid Karat
```

`IntEnum` members behave as ints, so `Decimal(Karat.K22) / 24` works and existing code that compares `karat == 22` keeps working. `Karat(19)` raising `ValueError` is the karat check written once, by the type.

For values that are not numbers, use `Enum`:

```python
>>> from enum import Enum
>>> class Metal(Enum):
...     GOLD = "gold"
...     SILVER = "silver"
...
>>> Metal("gold")
<Metal.GOLD: 'gold'>
>>> Metal.GOLD.value
'gold'
```

Use an enum when the set of allowed values is small, known, and part of the business. Use a plain `int` with a check when the values are open-ended or come from a table that changes.

## Inheritance, briefly

`class UnsupportedKaratError(PricingError)` on the previous page is inheritance: the subclass gets everything the parent has and can add or override. For exceptions that is exactly right, because `except ValueError` should catch your subclass. For domain objects, reach for composition first; deep class hierarchies are hard to change. R2 introduces `Protocol`, which gives you "any object with a `charge` method" without inheritance at all.

## Where these go

You built these in the REPL. The release gate puts two frozen dataclasses in `src/gold_pasal/pricing.py`: `QuoteInput`, which validates in `__post_init__`, and `QuoteResult`, which holds the five NPR amounts. R2 adds `Money`, `Weight`, and `Purity` on the same pattern.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `TypeError: __init__() missing 1 required positional argument` | Fewer values than fields without defaults | Pass every required field, or add a default |
| `ValueError: mutable default <class 'list'> for field tags is not allowed` | `tags: list[str] = []` | `field(default_factory=list)` |
| `TypeError: non-default argument follows default argument` | A required field after a defaulted one | Put defaults last |
| `FrozenInstanceError` | Assigned to a frozen instance | `replace(obj, field=value)` to build a new one |
| `NameError: name 'self' is not defined` | Used `self` outside a method | `self` only exists inside methods |
| `ValueError: 19 is not a valid Karat` | Correct behavior | Catch it, or validate before calling `Karat(...)` |

## Practice

<LessonQuiz
  question="A frozen dataclass Ornament has fields sku, grams, karat. You need the same ornament at 18K. Which works?"
  a="ring.karat = 18"
  b="replace(ring, karat=18)"
  c="ring['karat'] = 18"
  d="Ornament.karat = 18"
  correct="b"
>

Frozen instances refuse attribute assignment, and a dataclass is not a dict. `dataclasses.replace` returns a new instance with the given fields changed and every other field copied.

</LessonQuiz>

Next: [Type hints, Protocols, and pyright](04-type-hints-protocols-and-pyright), which is how the `: Decimal` and `-> Decimal` annotations you have been writing get checked.

<EvidenceCard
  command="uv run python"
  artifact="a frozen Ornament dataclass that raises on karat 16, and a Karat IntEnum"
  invariant="A domain object cannot be constructed in an invalid state"
/>
