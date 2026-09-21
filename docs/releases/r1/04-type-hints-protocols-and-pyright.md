---
id: r1-04
title: "Type hints, Protocols, and pyright"
release: r1
order: 4
prerequisites: [r1-03]
outcomes:
  - Annotate parameters, returns, variables, and collections
  - Express optional values, literals, callables, and structural types with Protocol
  - Run uv run pyright and fix a reported error
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend developer"
  problem="making_charge(Decimal('5.00'), 1500) runs and returns 7500. making_charge(1500, Decimal('5.00')) also runs and also returns 7500, and neither call was what the caller meant. Python found nothing wrong."
  destination="Every function in src/ and tests/ is annotated, uv run pyright reports 0 errors, and a swapped or mistyped argument is caught before the code runs."
/>

# Type hints, Protocols, and pyright

A **type hint** is an annotation that says what kind of value a name should hold. Python ignores hints at runtime. **pyright** (a static type checker) reads them and reports mismatches before anything runs. This shop runs pyright in **strict** mode on `src/` and `tests/`, so every function you put there needs hints.

## See the idea first

Save this as `scratch.py` at the shop root:

```python
from decimal import Decimal


def making_charge(grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return grams * charge_per_gram


total: Decimal = making_charge(Decimal("5.00"), 1500)
label: str = total
```

```bash
uv run pyright scratch.py
```

```text
scratch.py
  scratch.py:8:49 - error: Argument of type "Literal[1500]" cannot be assigned to parameter "charge_per_gram" of type "Decimal" in function "making_charge"
    "Literal[1500]" is not assignable to "Decimal" (reportArgumentType)
  scratch.py:9:14 - error: Type "Decimal" is not assignable to declared type "str"
    "Decimal" is not assignable to "str" (reportAssignmentType)
2 errors, 0 warnings, 0 informations
```

Both lines would have run without complaint. pyright caught them by reading the hints. Delete `scratch.py` after this page.

## Annotate functions and variables

```python
def making_charge(grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return grams * charge_per_gram
```

`name: Type` after each parameter, `-> Type` before the colon for the return. A function that returns nothing is `-> None`.

Variables can be annotated too, though pyright usually infers them from the right-hand side:

```python
rate_per_tola: Decimal = Decimal("200000")
supported = (14, 18, 22, 24)  # inferred as tuple[int, int, int, int]
```

Annotate a variable when you create it empty and fill it later (`values: list[Decimal] = []`), or when the inferred type is narrower than you mean.

## Collections

Use the built-in names with square brackets:

| Hint | Meaning |
| --- | --- |
| `list[str]` | a list of strings |
| `dict[str, Decimal]` | keys are SKUs, values are grams |
| `tuple[str, Decimal, int]` | a row with exactly three positions |
| `tuple[int, ...]` | any number of ints |
| `set[int]` | supported karats |

```python
def heaviest(catalog: dict[str, Decimal]) -> str:
    return max(catalog, key=lambda sku: catalog[sku])
```

## None and unions

`X | None` means "an X or nothing". pyright makes you handle the `None` case before you use the value:

```python
def find_weight(catalog: dict[str, Decimal], sku: str) -> Decimal | None:
    return catalog.get(sku)


grams = find_weight(catalog, "RING-01")
tola = grams / GRAMS_PER_TOLA          # error: "None" not supported for "/"
if grams is not None:
    tola = grams / GRAMS_PER_TOLA      # fine: narrowed to Decimal
```

The `if grams is not None` is called **narrowing**. `isinstance` checks narrow the same way. The error is the point: a lookup that can miss must be handled where it is called.

`Decimal | int` means either type is accepted. Keep unions small; a function that accepts five types usually wants a dataclass instead.

## Literal and type aliases

`Literal` restricts a value to specific constants. A **type alias** gives a hint a name:

```python
from typing import Literal, TypeAlias

KaratValue: TypeAlias = Literal[14, 18, 22, 24]


def purity_factor(karat: KaratValue) -> Decimal:
    return Decimal(karat) / Decimal(24)
```

`purity_factor(19)` is now a pyright error. It is still only a static check: a `19` that arrives from the command line at runtime is an `int` as far as Python is concerned, so the `UnsupportedKaratError` raise from the previous pages stays. Hints and runtime checks do different jobs.

## Callable

A parameter that is itself a function:

```python
from collections.abc import Callable


def apply_charge(policy: Callable[[Decimal], Decimal], grams: Decimal) -> Decimal:
    return policy(grams)
```

`Callable[[Decimal], Decimal]` reads "takes one Decimal, returns a Decimal". `apply_charge(lambda g: g * Decimal("1500"), Decimal("5.00"))` type-checks; passing `len` does not.

## Protocol

A **Protocol** describes a shape: any object with these methods and signatures fits, whether or not it inherits from anything. This is **structural typing**.

```python
from typing import Protocol


class MakingChargePolicy(Protocol):
    def charge(self, grams: Decimal) -> Decimal: ...


class PerGram:
    def __init__(self, rate: Decimal) -> None:
        self.rate = rate

    def charge(self, grams: Decimal) -> Decimal:
        return grams * self.rate


def total_making(policy: MakingChargePolicy, grams: Decimal) -> Decimal:
    return policy.charge(grams)
```

```python
>>> total_making(PerGram(Decimal("1500")), Decimal("5.00"))
Decimal('7500.00')
```

`PerGram` never mentions `MakingChargePolicy`. It fits because it has a `charge` method with the right signature. A `FlatFee` class with the same method would fit too. R2 uses exactly this Protocol to swap making-charge rules without an `if festival:` in the pricing code, and a `CatalogRepository` Protocol that a dict-backed fake and a Postgres implementation both satisfy.

The `...` body is deliberate: a Protocol declares, it does not implement.

## Generics, briefly

When a function works on "a list of anything" and returns "one of those", a `TypeVar` keeps the connection:

```python
from typing import TypeVar

T = TypeVar("T")


def first(items: list[T]) -> T:
    return items[0]
```

`first(["RING-01"])` is a `str`; `first([Decimal("5")])` is a `Decimal`. You will read this more than write it. Most shop code gets by with concrete types and dataclasses.

## Hints do not run

```python
def making_charge(grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return grams * charge_per_gram


making_charge(5, 1500)   # Python happily returns 7500
```

pyright flags that line. Python runs it. Hints are documentation that a tool can verify; they are not validation. Validate at the boundary (CLI arguments, HTTP bodies, file contents) with real code, then trust the hints inside.

::: tip Reading pyright output
`file:line:column - error: message (ruleName)`. The message says what type arrived and what type was declared. Fix the side that is wrong: often the call site passed the wrong thing, sometimes the annotation was too narrow. Do not reach for `# type: ignore`; in this shop that comment needs a reason next to it.
:::

## pyright in this shop

`pyproject.toml` already configures it:

```toml
[tool.pyright]
pythonVersion = "3.12"
typeCheckingMode = "strict"
include = ["src", "tests"]
```

Run it on everything the config includes:

```bash
uv run pyright
```

```text
0 errors, 0 warnings, 0 informations
```

Strict mode adds rules you will meet on the gate page:

| Rule | It fires when | Fix |
| --- | --- | --- |
| `reportMissingParameterType` | a parameter has no hint | add `: Type` |
| `reportUnknownVariableType` | pyright cannot infer a type (often from an unannotated dict or `json.loads`) | annotate the variable, or build a dataclass |
| `reportArgumentType` | the argument type does not match the parameter | fix the call or the hint |
| `reportOptionalMemberAccess` | you used a value that may be `None` | narrow with `if x is not None` |
| `reportUnusedImport` | an import is never used | delete it |

`counter.py` at the shop root is not in `include`, so pyright ignores it. Everything under `src/gold_pasal/` and `tests/` is checked on every `./scripts/verify.sh`.

### reveal_type

When you are unsure what pyright thinks a value is, ask:

```python
from typing import reveal_type

reveal_type(catalog.get("RING-01"))   # information: Type of ... is "Decimal | None"
```

pyright prints the type as an information line. Remove the call before you commit.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `reportMissingParameterType` | Unannotated parameter in `src/` or `tests/` | Add the hint |
| `"None" is not assignable to "Decimal"` | Used an optional value without narrowing | `if value is None: raise ...` or return early |
| `"Literal[1500]" is not assignable to "Decimal"` | Passed an int where a Decimal is declared | `Decimal("1500")` |
| `Import "typing_extensions" could not be resolved` | Used a name Python 3.12's `typing` already has | Import from `typing` |
| pyright is green but the program crashes | Hints do not run | Add a runtime check at the boundary |

## Practice

<LessonQuiz
  question="def find_weight(catalog: dict[str, Decimal], sku: str) -> Decimal | None. Which line passes pyright?"
  a="tola = find_weight(catalog, 'RING-01') / GRAMS_PER_TOLA"
  b="grams = find_weight(catalog, 'RING-01'); tola = grams / GRAMS_PER_TOLA"
  c="grams = find_weight(catalog, 'RING-01'); if grams is None: raise KeyError('RING-01'); tola = grams / GRAMS_PER_TOLA"
  d="grams: Decimal = find_weight(catalog, 'RING-01')"
  correct="c"
>

Only the version that handles `None` before dividing narrows `grams` to `Decimal`. The others either divide a possible `None` or assign a `Decimal | None` to a name declared `Decimal`.

</LessonQuiz>

Next: [Generators, files, and decorators](05-generators-files-and-decorators).

<EvidenceCard
  command="uv run pyright"
  artifact="0 errors on src/ and tests/ after annotating units.py and errors.py"
  invariant="A wrong type at a function boundary is a pyright error, not a wrong receipt"
/>
