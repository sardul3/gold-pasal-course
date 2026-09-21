---
id: r0-02
title: "Run Python in gold-pasal"
release: r0
order: 2
prerequisites: [r0-01]
outcomes:
  - Start and leave the Python REPL with uv run python
  - Bind values to names and print them
  - Save a script file and run it with uv run python counter.py
evidence: [commit]
---

<LessonMission
  role="new backend developer"
  problem="Maya is at the Patan counter with an 11.6638038 g ornament. You have a shop folder and no idea where Python code goes or how it runs."
  destination="You can type Python at a prompt, save it in a file, run the file, and read what it prints."
/>

# Run Python in gold-pasal

There are two ways to run Python in this shop. The **REPL** (read, evaluate, print, loop) is a prompt where each line runs as you type it. A **script** is a `.py` file that runs top to bottom. You will use both on every page of this guide.

## See the idea first

From `gold-pasal`:

```bash
pwd
```

The last folder in the path must be `gold-pasal`. Then start Python with **uv** (the shop's package and environment manager):

```bash
uv run python
```

You should see a version banner and a `>>>` prompt:

```text
Python 3.12.x (main, ...)
Type "help", "copyright", "credits" or "license" for more information.
>>>
```

Type one line and press Enter:

```python
print("Namaste, Maya")
```

```text
Namaste, Maya
```

`print` writes text to the terminal. The quotes mark a **string** (text). Python printed the text without the quotes.

Leave with:

```python
exit()
```

## The REPL

Start `uv run python` again. In the REPL, an expression on its own echoes its value; you do not need `print`:

```python
>>> 22 / 24
0.9166666666666666
>>> "Maya"
'Maya'
```

Notice the string echoes with quotes and prints without them. The echo shows you the value as Python stores it. `print` shows you what a person would read.

Multi-line statements show a `...` continuation prompt. Press Enter on an empty line to finish:

```python
>>> for karat in (14, 18, 22, 24):
...     print(karat)
...
14
18
22
24
```

::: tip
In this guide, lines that start with `>>>` or `...` are what you type. Lines without a prompt are the output. When a code block has no prompt at all, it is a file, or a block you paste into the REPL in one go.
:::

## Variables and assignment

A **variable** is a name bound to a value. `=` binds:

```python
>>> customer_name = "Maya"
>>> weight_grams = 11.6638038
>>> karat = 22
>>> rate_per_tola = 200000
>>> print(customer_name, weight_grams, karat, rate_per_tola)
Maya 11.6638038 22 200000
```

`print` with several arguments separates them with a space.

Rebinding points the same name at a new value. The old value is gone from that name:

```python
>>> karat = 24
>>> karat
24
>>> karat = karat - 2
>>> karat
22
```

`karat = karat - 2` is not algebra. Python evaluates the right side first (`24 - 2`), then binds `karat` to `22`.

Several names at once:

```python
>>> sku, grams = "RING-01", 5.00
>>> sku
'RING-01'
>>> grams
5.0
```

### Names

Names use letters, digits, and underscores, and cannot start with a digit. This shop writes `snake_case` for variables and functions and `ALL_CAPS` for values that should not change:

```python
GRAMS_PER_TOLA = 11.6638038
rate_per_tola = 200000
```

Python does not stop you from rebinding `GRAMS_PER_TOLA`. The capitals are a message to the next reader.

Put units in the name. `200000` alone could be NPR per tola or NPR per gram. `rate_per_tola` is not ambiguous.

### Comments

Anything after `#` on a line is a **comment**. Python ignores it:

```python
rate_per_tola = 200000  # NPR, 24K reference rate from the board
```

Write a comment for the why. The line already says the what.

## Run a script file

The REPL forgets everything when you exit. Put the same lines in a file and they run every time.

1. In `gold-pasal`, create `counter.py`:

```python
customer_name = "Maya"
weight_grams = 11.6638038
karat = 22
rate_per_tola = 200000

print(customer_name, weight_grams, karat, rate_per_tola)
print("Purity:", karat / 24)
```

2. From `gold-pasal`, run it:

```bash
uv run python counter.py
```

```text
Maya 11.6638038 22 200000
Purity: 0.9166666666666666
```

A script does not echo bare expressions the way the REPL does. If you want to see a value, `print` it.

`uv run` runs the command inside this project's environment, so the Python version and installed packages are the ones the shop pinned. Use it in front of `python`, `pytest`, and every other tool in this course.

::: tip Keep counter.py
This file grows through R0. The release gate at the end runs it. Leave it at the shop root for now; R1 moves the logic into the `gold_pasal` package.
:::

## Ask Python about a value

Three built-ins answer most "what is this" questions:

```python
>>> type(karat)
<class 'int'>
>>> type(customer_name)
<class 'str'>
>>> help(print)
```

`help` opens a pager. Press `q` to leave it. `type` tells you which kind of value a name holds, which is the subject of the next page.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `pwd` does not end in `gold-pasal` | You are in the course folder or your home folder | `cd` into `gold-pasal` |
| `uv: command not found` | uv is not installed or not on `PATH` | [How to freeze-sync the shop](/side-quests/prepare-the-gold-pasal-bench) |
| `NameError: name 'karat' is not defined` | You printed before binding, or restarted the REPL | Bind the name again, then print |
| `SyntaxError: unterminated string literal` | A quote is missing | Every `"` needs a closing `"` |
| `can't open file 'counter.py'` | The file is not in the folder you are in | Save it at the shop root, run from there |

## Practice

<LessonQuiz
  question="In the REPL you type karat = 22, then karat = karat + 2, then karat. What echoes?"
  a="22"
  b="24"
  c="karat + 2"
  d="A SyntaxError, because = is not algebra"
  correct="b"
>

Python evaluates `karat + 2` with the current value (`22`), gets `24`, and binds `karat` to it. Typing `karat` alone echoes `24`.

</LessonQuiz>

Next: [Numbers, strings, and Decimal](03-numbers-strings-and-decimal), where the float `11.6638038` becomes an exact `Decimal`.

<EvidenceCard
  command="uv run python counter.py"
  artifact="counter.py printing Maya's four facts and a purity line"
  invariant="Every quote input has a named variable you can print"
/>
