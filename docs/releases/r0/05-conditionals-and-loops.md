---
id: r0-05
title: "Conditionals and loops"
release: r0
order: 5
prerequisites: [r0-04]
outcomes:
  - Branch with if, elif, and else on karat
  - Loop a tray with for, enumerate, zip, and range
  - Build a filtered list with a comprehension
evidence: [commit]
---

<LessonMission
  role="counter salesperson"
  problem="Three ornaments are on the tray. One is stamped 16K, which the shop does not sell. The script prices only Maya's row, and it would price the 16K bangle as if it were fine."
  destination="counter.py loops the whole tray, skips unsupported karat with a message, and prices the rest."
/>

# Conditionals and loops

`if` chooses which lines run. `for` runs the same lines once per item. Together they turn "price Maya's row" into "price everything on the tray that we are allowed to sell".

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> SUPPORTED_KARATS = {14, 18, 22, 24}
>>> for karat in [22, 19, 24]:
...     if karat in SUPPORTED_KARATS:
...         print("quote", karat)
...     else:
...         print("stop", karat)
...
quote 22
stop 19
quote 24
```

The body of `for` runs three times. Inside it, `if` picks one of two branches each time.

## if, elif, else

```python
>>> karat = 22
>>> if karat == 24:
...     label = "full gold"
... elif karat in SUPPORTED_KARATS:
...     label = "alloy"
... else:
...     label = "unsupported"
...
>>> label
'alloy'
```

Python checks the conditions top to bottom and runs the first branch whose condition is true. `elif` is short for "else if". `else` catches everything left. Only one branch runs.

### Indentation is the block

The lines that belong to a branch are the ones indented under it. Four spaces is the convention this shop follows. There are no braces; unindent to leave the block.

```python
if karat not in SUPPORTED_KARATS:
    print("stop")
    print("this line is also inside the if")
print("this line always runs")
```

### Comparisons and boolean logic

| Operator | Meaning |
| --- | --- |
| `==`, `!=` | equal, not equal |
| `<`, `<=`, `>`, `>=` | ordering |
| `in`, `not in` | membership |
| `is`, `is not` | same object (use for `None`) |
| `and`, `or`, `not` | combine |

Comparison chains read like maths:

```python
>>> 14 <= karat <= 24
True
```

`and` stops early. In `grams is not None and grams > 0`, the second half never runs when `grams` is `None`, so it cannot fail on it.

### Conditional expression

A one-line `if` for choosing a value:

```python
>>> label = "full gold" if karat == 24 else "alloy"
>>> label
'alloy'
```

Use it for a value. Use the block form when there is more than one line per branch.

## for loops

`for` visits each item of any collection:

```python
>>> tray = ["Sajilo 22K Ring", "Tilhari Necklace"]
>>> for name in tray:
...     print(name.upper())
...
SAJILO 22K RING
TILHARI NECKLACE
```

### Unpack rows

When the items are tuples, unpack them in the `for` line:

```python
>>> from decimal import Decimal
>>> rows = [("RING-01", Decimal("5.00"), 22), ("CHAIN-02", Decimal("11.6638038"), 22)]
>>> for sku, grams, karat in rows:
...     print(sku, grams, karat)
...
RING-01 5.00 22
CHAIN-02 11.6638038 22
```

### Dict items

```python
>>> catalog = {"RING-01": Decimal("5.00"), "CHAIN-02": Decimal("11.6638038")}
>>> for sku, grams in catalog.items():
...     print(f"{sku}: {grams} g")
...
RING-01: 5.00 g
CHAIN-02: 11.6638038 g
```

### range, enumerate, zip

`range` counts. `enumerate` gives you the position alongside the item. `zip` walks two collections together.

```python
>>> list(range(3))
[0, 1, 2]
>>> list(range(14, 25, 4))
[14, 18, 22]
>>> for position, name in enumerate(tray, start=1):
...     print(position, name)
...
1 Sajilo 22K Ring
2 Tilhari Necklace
>>> skus = ["RING-01", "CHAIN-02"]
>>> grams = [Decimal("5.00"), Decimal("11.6638038")]
>>> for sku, g in zip(skus, grams):
...     print(sku, g)
...
RING-01 5.00
CHAIN-02 11.6638038
```

`range(14, 25, 4)` stops before `25`, so `26` is never produced. If you find yourself writing `for i in range(len(tray))` to then index `tray[i]`, use `enumerate` instead.

### break and continue

`continue` skips to the next item. `break` leaves the loop entirely.

```python
>>> for karat in [22, 19, 24]:
...     if karat not in SUPPORTED_KARATS:
...         print("skip", karat)
...         continue
...     print("quote", karat)
...
quote 22
skip 19
quote 24
```

`continue` is how a script handles a bad row without stopping the whole tray. `break` is for "found it, stop looking".

## while loops

`while` repeats as long as a condition holds:

```python
>>> remaining = 3
>>> while remaining > 0:
...     print("tick", remaining)
...     remaining -= 1
...
tick 3
tick 2
tick 1
```

`remaining -= 1` is shorthand for `remaining = remaining - 1`. If you forget that line the loop never ends; press `Ctrl-C` to stop it. Reach for `while` when you do not know the count in advance (waiting for input, retrying a call). For a tray, `for` is the right loop.

## Comprehensions

A **comprehension** builds a new collection from an existing one in a single expression:

```python
>>> [name.upper() for name in tray]
['SAJILO 22K RING', 'TILHARI NECKLACE']
>>> [k for k in range(10, 25) if k in SUPPORTED_KARATS]
[14, 18, 22, 24]
```

Read it left to right: "the upper-cased name, for each name in tray". The optional `if` at the end filters.

Dict and set comprehensions use braces:

```python
>>> {sku: grams * 2 for sku, grams in catalog.items()}
{'RING-01': Decimal('10.00'), 'CHAIN-02': Decimal('23.3276076')}
>>> sorted({karat for _, _, karat in rows})
[22]
```

`_` is the conventional name for a value you unpack but do not use.

A comprehension is the right tool when the loop body is one expression. When the body needs several statements or an early `continue`, write the `for` loop.

## match

`match` compares one value against several patterns. It reads well for a small fixed set like karat:

```python
>>> match karat:
...     case 24:
...         print("full gold")
...     case 22 | 18 | 14:
...         print("alloy")
...     case _:
...         print("unsupported")
...
alloy
```

`|` means "or" inside a pattern. `case _` is the catch-all. An `if`/`elif` chain does the same job; `match` is worth knowing because you will meet it in other code.

## Update counter.py

Loop the whole tray and branch on karat:

```python
from decimal import ROUND_HALF_UP, Decimal

GRAMS_PER_TOLA = Decimal("11.6638038")
SUPPORTED_KARATS = {14, 18, 22, 24}
RATE_PER_TOLA = Decimal("200000")

tray = [
    ("RING-01", Decimal("5.00"), 22),
    ("CHAIN-02", Decimal("11.6638038"), 22),
    ("BANGLE-09", Decimal("8.40"), 16),
]

for sku, grams, karat in tray:
    if karat not in SUPPORTED_KARATS:
        print(f"{sku}: stop, {karat}K is not a supported karat")
        continue
    tola = grams / GRAMS_PER_TOLA
    gold_value = RATE_PER_TOLA * tola * Decimal(karat) / Decimal(24)
    displayed = gold_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    print(f"{sku}: gold NPR {displayed}")
```

```bash
uv run python counter.py
```

```text
RING-01: gold NPR 78590.71
CHAIN-02: gold NPR 183333.33
BANGLE-09: stop, 16K is not a supported karat
```

Walk `RING-01` once: `karat` is `22`, which is in the set, so the `if` is false and `continue` does not run. `tola` is `5.00 / 11.6638038`, about `0.4287`. Gold is `200000 × 0.4287 × 22 / 24`, which displays as `78590.71`. The bangle row hits the `if`, prints the stop line, and `continue` skips the arithmetic.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `IndentationError: expected an indented block` | Nothing indented under `if` or `for` | Indent the body four spaces |
| `SyntaxError: invalid syntax` pointing at `if karat = 22` | Single `=` in a condition | Comparison is `==` |
| Loop never ends | `while` condition never becomes false | `Ctrl-C`, then make sure the loop changes the variable it tests |
| `ValueError: too many values to unpack` | Row shape does not match the `for` names | Same number of names as tuple parts |
| Only the last ornament printed | `print` sits outside the loop | Indent it under `for` |

## Practice

<LessonQuiz
  question="tray = [('RING-01', 22), ('BANGLE-09', 16), ('CHAIN-02', 22)]. How many times does print run in: for sku, karat in tray: if karat not in {14, 18, 22, 24}: continue; print(sku)"
  a="0"
  b="1"
  c="2"
  d="3"
  correct="c"
>

The bangle row hits `continue` before `print`. The ring and the chain reach `print`. Two lines.

</LessonQuiz>

Next: [Functions](06-functions), which give the gold-value arithmetic a name you can call from a test.

<EvidenceCard
  command="uv run python counter.py"
  artifact="counter.py looping three rows, pricing two, and stopping on 16K"
  invariant="Unsupported karat is skipped with a message, never priced"
/>
