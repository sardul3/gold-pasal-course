---
id: r0-01
title: "Welcome to Gold Pasal"
release: r0
order: 1
prerequisites: []
outcomes:
  - Open the gold-pasal shop folder next to gold-pasal-course
  - Point at the smoke test that asserts gold_pasal.__version__ == "0.1.0"
  - State that R0 does not include a quote, an API, a database, or AI
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend engineer"
  problem="You joined a Nepal jewelry shop and found two folders. The shop itself, the smoke test, and what R0 will not build are still unnamed."
  destination="You have opened gold-pasal, can point at the smoke test that asserts version 0.1.0, and know R0 does not include a quote, an API, a database, or AI."
/>

# Welcome to Gold Pasal

Gold Pasal is the **backend** (store rules and data, not the shopper's screen) for a Nepal jewelry shop — **pasal** means shop. Open the shop folder and the smoke test that asserts version `0.1.0`. R0 does not include a quote, an API, a database, or AI.

## See the idea first

1. List the two folders:

```bash
ls ~/dev
```

You should see both names (other files may appear too):

```text
gold-pasal
gold-pasal-course
```

Notice `gold-pasal` is the shop you type in, sitting **next to** `gold-pasal-course` (this lesson site). If you only see the course, get the shop starter from the same place you got this course and put it beside it. Do not paste shop files into the lesson site.

2. From `~/dev`, enter the shop:

```bash
cd ~/dev/gold-pasal
pwd
```

Expected (your home path may differ; the last folder must be `gold-pasal`):

```text
/Users/you/dev/gold-pasal
```

Notice the path ends in `gold-pasal`, not `gold-pasal-course`. Open that folder in your editor (File → Open Folder). Later scripts such as `./scripts/verify.sh` live here.

## Open the smoke test

3. In the shop, open `tests/test_setup.py`:

```python
import gold_pasal


def test_given_fresh_checkout_when_package_is_imported_then_setup_is_ready() -> None:
    assert gold_pasal.__version__ == "0.1.0"
```

This is a **smoke test** (the smallest check that the shop opened). The line that matters is `assert gold_pasal.__version__ == "0.1.0"`.

That same string is set in `src/gold_pasal/__init__.py`:

```python
__version__ = "0.1.0"
```

If only one of those two places changes, the check fails on purpose.

## Run this

4. **uv** is this repo's package and environment manager. If you already have uv and have synced the shop, from `gold-pasal` run:

```bash
uv run pytest tests/test_setup.py -q
```

Expected (times may differ):

```text
.                                                                        [100%]
1 passed in 0.00s
```

Notice the `.` and `1 passed`. Quiet pytest (`-q`) does not print a gold quote.

If `uv` is missing, leave the files open and install it in [Prepare the workshop](03-prepare-the-terminal-git-python-uv-editor-and-repository-safely). Do not add quote, API, database, or AI code to make the folder feel complete.

R0 graduation evidence is a small commit plus a green `application-ci` run; see the [evidence rubric](/reference/evidence-rubric).

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `ls ~/dev` has no `gold-pasal` | Shop starter is missing | Get it from the same place as this course; put it next to `gold-pasal-course` |
| `pwd` ends in `gold-pasal-course` | You are in the lesson site | `cd ~/dev/gold-pasal` |
| `uv: command not found` | uv is not installed yet | Continue to [Prepare the workshop](03-prepare-the-terminal-git-python-uv-editor-and-repository-safely) |

## Practice

<LessonQuiz
  question="In tests/test_setup.py, what must be true for the smoke test to pass?"
  a="Maya's NPR total is printed"
  b="gold_pasal.__version__ equals the string 0.1.0"
  c="The terminal is in gold-pasal-course"
  d="A quote API is already running"
  correct="b"
>

The smoke test asserts `gold_pasal.__version__ == "0.1.0"`. It does not print a quote or require an API.

</LessonQuiz>

Next: [Java to Python](02-map-java-spring-habits-to-python-fastapiplus-where-the-analogy-fails), then install uv if it is missing.

<EvidenceCard
  command="ls ~/dev && cd ~/dev/gold-pasal && pwd"
  artifact="shop folder open, smoke test asserting 0.1.0, R0 named as setup-only"
  invariant="R0 does not include a quote, an API, a database, or AI"
/>
