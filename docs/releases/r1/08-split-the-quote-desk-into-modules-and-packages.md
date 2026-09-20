---
id: r1-08
title: "Split the quote desk into modules and packages"
release: r1
order: 8
prerequisites: [r1-07]
outcomes:
  - Put pricing rules in gold_pasal.pricing and CLI wiring in gold_pasal.cli
  - Keep import of pricing silent (no print at import time)
  - Avoid circular imports between cli and pricing
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="Parsing flags, jewelry rules, and NPR formatting are growing in one file, so a CLI change can break arithmetic."
  destination="Importing pricing prints nothing; the CLI delegates to quote functions."
/>

# Split the quote desk into modules and packages

A **module** is one importable Python file. A **package** is an importable directory of modules. Here that package is `src/gold_pasal`.

## See the idea first

Sketch, not a solved app:

```text
gold_pasal/
  __init__.py      package metadata
  pricing.py       quote rules and arithmetic
  cli.py           command parsing, error display, exit status
```

`from gold_pasal.pricing import quote` loads the package, then the module, then binds `quote`. An **absolute import** starts at the top-level package name.

A **circular import** happens when `cli.py` and `pricing.py` import each other while initialization is incomplete. `cli` may import `pricing`. `pricing` must not import `cli`. Pricing should not know about `sys.argv`.

Python runs top-level statements at import time. Keep calculations and printing inside functions.

## Lock public behavior before moving code

A **characterization test** records existing observable behavior so a refactor cannot change it accidentally. Assert the one-tola 24K itemized values. Run it green. Move one responsibility. Update imports. Rerun the focused test, then the suite. Expected business numbers must not change.

## Practice

Write a test that imports `gold_pasal.pricing` and captures stdout. Predict empty output. If the current module prints at import time, move that work behind a function.

```python
def gold_value(rate, purity):
    return rate * purity

print(gold_value(200000, 0.9166666667))
```

You should see a float near `183333.33`. In the shop, use `Decimal` in `pricing.py` instead of this bench.

<LessonQuiz
  question="If pricing.py prints a quote while it is imported, who sees that print?"
  a="Only the CLI user"
  b="Every importer, including tests"
  c="Only Pyright"
  d="Nobody; import never runs code"
  correct="b"
>

Imports execute top-level statements. Tests and the CLI would both inherit the side effect.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k pricing
./scripts/verify.sh
```

Next: [Type hints](09-add-type-hints-and-let-pyright-find-a-real-defect).

<EvidenceCard
  command="uv run pytest -q -k pricing"
  artifact="pricing import is silent; CLI imports pricing, not the reverse"
  invariant="moving files does not change quoted NPR amounts"
/>
