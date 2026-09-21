---
title: "R0: Core Python"
description: "Set up the workshop, then values, collections, control flow, and functions, practiced on the Gold Pasal tray."
---

# R0: Core Python

**What you'll have:** a working `gold-pasal` repository and the Python you need to read and write a small program: values and names, numbers and strings, collections, `if` and `for`, and functions. Every example uses the Gold Pasal counter (SKUs, grams, karat, NPR), so the code you type here is the code the shop uses later.

<LessonMission
  role="new backend developer"
  problem="Maya's ring is on the felt. The facts live in someone's head: name, grams, karat, rate. There is no repository, no Python, and you have not written Python before."
  destination="You can build the shop repository from scratch, run Python in it, model a tray of ornaments with lists and dicts, branch on karat, and put pricing rules in functions that a test can call."
/>

## Before you start

Nothing. This release begins with an empty machine. The first page installs Git and uv and creates `gold-pasal`; every page after it says "from `gold-pasal`" and means that folder.

## Guide

Read in order. Each page is a topic, in the style of a language guide: a short example, its output, then the details.

| Page | You will be able to |
| --- | --- |
| [Set up the workshop](01-set-up-the-workshop) | install Git and uv, create the repository, run the verify gate, commit |
| [Run Python in gold-pasal](02-run-python-in-gold-pasal) | start the REPL, bind names, run a script file |
| [Numbers, strings, and Decimal](03-numbers-strings-and-decimal) | do arithmetic, keep NPR exact, format a receipt line |
| [Lists, tuples, dicts, and sets](04-lists-tuples-dicts-and-sets) | hold a tray of SKUs and look one up |
| [Conditionals and loops](05-conditionals-and-loops) | branch on karat, loop a tray, write a comprehension |
| [Functions](06-functions) | name a pricing rule, pass arguments, return a value |
| [Release gate: counter script](07-release-gate-counter-script) | run `counter.py` and a green `tests/test_counter.py` |

## Release evidence

From `gold-pasal`:

```bash
uv run python counter.py
./scripts/verify.sh
```

## What R1 starts from

`counter.py` at the shop root, `tests/test_counter.py` with three passing tests, and a green `verify.sh`. R1 moves the pricing rules into the `gold_pasal` package and adds exceptions, classes, type hints, and a real CLI.
