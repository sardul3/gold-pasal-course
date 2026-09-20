---
id: r0-04
title: "The first program"
release: r0
order: 4
prerequisites: [r0-03]
outcomes:
  - Print gold_pasal.__version__ as 0.1.0 through uv
  - Inspect gold_pasal.__file__ and the type of __version__
  - Explain why a false assert on 9.9.9 raises AssertionError with exit status 1
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend engineer"
  problem="A version string typed into an unrelated global Python does not prove the shop package on disk is the one tests import."
  destination="You can show the file Python imported, the type of __version__, and a controlled assertion failure."
/>

# The first program

Work in `gold-pasal`. Your first program is already small: import `gold_pasal` and print `0.1.0` through the project environment.

## See the idea first

```bash
uv run python -c "import gold_pasal; print(gold_pasal.__version__)"
```

`python -c` runs the following string as Python. `import` loads a **module** (a file or package that groups names). `print` writes to the terminal.

Expected:

```text
0.1.0
```

Exit status `0`. If you see `ModuleNotFoundError: No module named 'gold_pasal'`, you are not using `uv run` from the shop root after `uv sync`.

## Collect the test by name

```bash
uv run pytest tests/test_setup.py -vv
```

You should see:

```text
tests/test_setup.py::test_given_fresh_checkout_when_package_is_imported_then_setup_is_ready PASSED
```

Copy that address later to rerun only that case.

<LessonQuiz
  question="Will importing gold_pasal print 0.1.0 by itself, or only when print is called?"
  a="Import prints 0.1.0 by itself"
  b="Only when print is called"
  c="Only when pytest imports the module"
  d="Never; __version__ is not set until print runs"
  correct="b"
>

`import gold_pasal` loads the module and sets `__version__`. It does not write to the terminal. The one-liner prints because of `print(...)`.

</LessonQuiz>

## Inspect the file and the type

```bash
uv run python -c "import gold_pasal; print(gold_pasal.__file__)"
uv run python -c "import gold_pasal; print(type(gold_pasal.__version__))"
```

The first path should end with `src/gold_pasal/__init__.py`. The second should print:

```text
<class 'str'>
```

The version is a string, not a number. `"0.1.0" == 0.1` is false. The smoke test compares strings.

Optional: `uv run python -c "import gold_pasal; breakpoint()"`. At the `pdb` prompt, type `p gold_pasal.__version__`, then `c`. A debugger screenshot is not R0 evidence.

## Practice

Predict the last traceback line, then run:

```bash
uv run python -c "import gold_pasal; assert gold_pasal.__version__ == '9.9.9'"
```

The import succeeds. The values differ, so Python raises `AssertionError` and returns exit status `1`. Last line:

```text
AssertionError
```

<PythonRunner
  label="A false assertion stops the next line"
  code="version = '0.1.0'
assert version == '9.9.9'
print('this line does not run')"
/>

Do not edit the package to satisfy this false expectation.

## Check

```bash
./scripts/verify.sh
```

Next: [Read a traceback](05-read-tracebacks-and-ask-useful-diagnostic-questions).

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="printed 0.1.0, __file__ under src/gold_pasal, false assert exit status 1"
  invariant="the smoke test imports this checkout's package, not a random Python"
/>
