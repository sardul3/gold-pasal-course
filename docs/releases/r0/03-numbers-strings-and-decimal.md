---
id: r0-03
title: "Numbers, strings, and Decimal"
release: r0
order: 3
prerequisites: [r0-02]
outcomes:
  - Use int, float, and Decimal and know which one holds NPR
  - Round a Decimal to paisa with ROUND_HALF_UP
  - Slice, search, and format strings with f-strings
evidence: [commit]
---

<LessonMission
  role="counter salesperson"
  problem="A float that looks like NPR 200,000 drifts by a paisa after a few multiplications. Maya's receipt must match a hand check exactly, and the SKU label must print cleanly."
  destination="You pick int, float, Decimal, str, or bool on purpose, keep money on Decimal, and format a receipt line with an f-string."
/>

# Numbers, strings, and Decimal

Every value has a **type**: the kind of thing it is. Maya's name is text. Karat is a whole number. NPR is money. Python will let you store karat as the text `"22K"`, and it will let you store NPR as a float. The shop will not. This page is how to choose.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> 0.1 + 0.2
0.30000000000000004
>>> from decimal import Decimal
>>> Decimal("0.1") + Decimal("0.2")
Decimal('0.3')
```

The first line is a **float**, a binary fraction that cannot hold one tenth exactly. The second is a **Decimal**, which keeps the decimal digits you typed. NPR and grams in this shop are always Decimal.

## Integers and floats

`int` is a whole number. `float` has a decimal point:

```python
>>> karat = 22
>>> type(karat)
<class 'int'>
>>> type(11.6638038)
<class 'float'>
```

Arithmetic operators:

```python
>>> 7 // 2      # floor division
3
>>> 7 % 2       # remainder
1
>>> 2 ** 10     # power
1024
>>> 7 / 2       # true division always gives a float
3.5
>>> 22 / 24
0.9166666666666666
```

`int` is the right type for karat and for counts (three rings on the tray). `float` is fine for a purity ratio you only print. It is wrong for money:

```python
>>> 200000 * 0.9166666
183333.32
```

That is one paisa short of `183333.33` before you have added wastage or VAT. Floats are the reason receipts and spreadsheets disagree.

## Decimal for money and weight

Import once per file or session:

```python
>>> from decimal import Decimal
>>> rate_per_tola = Decimal("200000")
>>> weight_grams = Decimal("11.6638038")
>>> rate_per_tola * Decimal(22) / Decimal(24)
Decimal('183333.3333333333333333333333')
```

Decimal arithmetic keeps 28 significant digits by default. That is enough for a jewelry quote; you round once, at the end.

### Build Decimal from a string

Pass a **string** to `Decimal`. A float literal has already lost digits before Decimal sees it:

```python
>>> Decimal("0.1")
Decimal('0.1')
>>> Decimal(0.1)
Decimal('0.1000000000000000055511151231257827021181583404541015625')
```

`Decimal(22)` from an `int` is fine: integers are exact.

### Round to paisa with quantize

`quantize` rounds to the pattern you pass. The shop rounds half up (`0.005` becomes `0.01`), so pass that mode explicitly:

```python
>>> from decimal import ROUND_HALF_UP
>>> Decimal("2.345").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
Decimal('2.35')
>>> Decimal("2.345").quantize(Decimal("0.01"))
Decimal('2.34')
```

The second call used Python's default, which rounds half to even. Always name `ROUND_HALF_UP` when a receipt is involved.

::: warning Round a copy, not the working value
Keep the full-precision Decimal for arithmetic. Round for display only. A total built by adding already-rounded lines is a different number from the rounded true total. The [pricing contract](/reference/pricing-contract) depends on this.
:::

Two Decimals compare by value, not by how many zeros they carry:

```python
>>> Decimal("7500.00") == Decimal("7500")
True
```

## Strings

A **string** (`str`) is text in single or double quotes. This shop uses double quotes.

```python
>>> name = "Sajilo 22K Ring"
>>> len(name)
15
>>> name[0]
'S'
>>> name[-1]
'g'
```

Indexes start at `0`. Negative indexes count from the end.

### Slicing

`name[start:stop]` takes characters from `start` up to but not including `stop`:

```python
>>> name[:6]
'Sajilo'
>>> name[7:]
'22K Ring'
```

Leave `start` empty to begin at the front; leave `stop` empty to run to the end.

### Common methods

Methods are called with a dot. Strings never change in place; each method returns a new string.

```python
>>> name.upper()
'SAJILO 22K RING'
>>> name.split()
['Sajilo', '22K', 'Ring']
>>> name.replace("Ring", "Bangle")
'Sajilo 22K Bangle'
>>> name.startswith("Sajilo")
True
>>> "22K" in name
True
>>> "  RING-01 ".strip()
'RING-01'
>>> "-".join(["RING", "01"])
'RING-01'
```

`split` gives you a list (next page). `in` checks whether one string appears inside another.

### Concatenation

`+` joins strings. It does not join a string and a number:

```python
>>> "RING-" + "01"
'RING-01'
>>> "Karat: " + 22
Traceback (most recent call last):
  ...
TypeError: can only concatenate str (not "int") to str
```

Use an f-string instead.

## f-strings

An **f-string** starts with `f` and evaluates anything inside `{}`:

```python
>>> sku = "RING-01"
>>> grams = Decimal("5.00")
>>> f"{sku}: {grams} g"
'RING-01: 5.00 g'
```

A **format spec** after a colon controls width and digits:

```python
>>> total = Decimal("231080.147")
>>> f"Total: NPR {total:.2f}"
'Total: NPR 231080.15'
>>> f"{Decimal('183333.3333'):,.2f}"
'183,333.33'
>>> f"{22 / 24:.4f}"
'0.9167'
>>> f"{sku:<10}|{grams:>8}|"
'RING-01   |    5.00|'
```

`.2f` means two digits after the point. `,` adds thousands separators. `<10` pads to ten characters on the left, `>8` on the right.

::: warning `.2f` rounds half to even
`f"{Decimal('2.345'):.2f}"` gives `'2.34'`, the same default as bare `quantize`. For a receipt, `quantize` with `ROUND_HALF_UP` first, then format the already-rounded value.
:::

`{name=}` prints the name and its value, useful while debugging:

```python
>>> f"{sku=}"
"sku='RING-01'"
```

## Booleans and None

`bool` is `True` or `False`. Comparisons produce one:

```python
>>> karat == 22
True
>>> karat != 24
True
>>> 14 <= karat <= 24
True
>>> Decimal("11.66") > Decimal("11.5")
True
```

Combine with `and`, `or`, `not`:

```python
>>> karat == 22 and grams > 0
True
>>> not True
False
```

`None` is the value that means "nothing here yet". Compare it with `is`:

```python
>>> discount = None
>>> discount is None
True
```

### Truthiness

In an `if`, every value counts as true or false. Empty things, zero, and `None` are false:

```python
>>> bool(0), bool(""), bool([]), bool(None)
(False, False, False, False)
>>> bool("0"), bool(22)
(True, True)
```

The string `"0"` is true because it is a non-empty string. Convert first if you mean the number.

## Converting between types

```python
>>> int("22")
22
>>> str(22) + "K"
'22K'
>>> Decimal("5.00")
Decimal('5.00')
>>> int(Decimal("22.9"))
22
```

`int` on a Decimal truncates; it does not round. Conversion fails loudly when the text is not a number:

```python
>>> int("22K")
Traceback (most recent call last):
  ...
ValueError: invalid literal for int() with base 10: '22K'
```

That `ValueError` is the right outcome. A karat of `"22K"` should stop the program, not become `0`. R1 turns this into a clean error message.

### Which type for which fact

| Fact | Type | Example |
| --- | --- | --- |
| customer name, SKU | `str` | `"RING-01"` |
| karat, count of items | `int` | `22` |
| NPR amounts, grams | `Decimal` | `Decimal("200000")` |
| a ratio you only print | `float` | `22 / 24` |
| yes or no | `bool` | `is_returning_customer = False` |
| not known yet | `None` | `discount = None` |

## Update counter.py

Replace the floats in `counter.py` with Decimal and add a formatted line:

```python
from decimal import ROUND_HALF_UP, Decimal

customer_name = "Maya"
weight_grams = Decimal("11.6638038")
karat = 22
rate_per_tola = Decimal("200000")

gold_value = rate_per_tola * Decimal(karat) / Decimal(24)
displayed = gold_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

print(f"{customer_name}: {weight_grams} g of {karat}K")
print(f"Gold value: NPR {displayed}")
```

```bash
uv run python counter.py
```

```text
Maya: 11.6638038 g of 22K
Gold value: NPR 183333.33
```

That gold value assumes Maya's piece is exactly one tola. The next pages add the tola conversion, more ornaments, and the other lines.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `NameError: name 'Decimal' is not defined` | Missing import | `from decimal import Decimal` at the top |
| `Decimal('0.1000000000000000055...')` | You passed a float into Decimal | Pass a string: `Decimal("0.1")` |
| `TypeError: unsupported operand type(s) for *: 'decimal.Decimal' and 'float'` | Mixed Decimal with a float | Make both sides Decimal |
| `2.34` where you expected `2.35` | Default rounding is half-even | Pass `rounding=ROUND_HALF_UP` to `quantize` |
| `TypeError: can only concatenate str (not "int") to str` | `+` between text and a number | Use an f-string |

## Practice

<LessonQuiz
  question="Which expression is the safe way to hold an NPR rate of 200,000?"
  a="200000.00"
  b="Decimal(200000.00)"
  c="Decimal('200000')"
  d="'NPR 200000'"
  correct="c"
>

A digit string into `Decimal` keeps exactly the digits you typed. A float literal, even wrapped in `Decimal` afterwards, was already rounded in binary. A string with `NPR` in it cannot be multiplied.

</LessonQuiz>

Next: [Lists, tuples, dicts, and sets](04-lists-tuples-dicts-and-sets), where one ornament becomes a tray.

<EvidenceCard
  command="uv run python counter.py"
  artifact="counter.py printing Gold value: NPR 183333.33 from Decimal inputs"
  invariant="NPR and grams are Decimal built from strings; rounding is ROUND_HALF_UP on a copy"
/>
