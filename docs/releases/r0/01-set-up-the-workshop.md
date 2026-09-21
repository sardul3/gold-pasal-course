---
id: r0-01
title: "Set up the workshop"
release: r0
order: 1
prerequisites: []
outcomes:
  - Install Git, uv, and Python 3.12 on a fresh machine
  - Create the gold-pasal repository from scratch with the files every later lesson expects
  - Run ./scripts/verify.sh green and make the first commit
evidence: [commit]
---

<LessonMission
  role="new backend developer"
  problem="You have a laptop and this website. There is no gold-pasal folder yet, no Python, and no idea which of the twenty tools people mention you need."
  destination="A gold-pasal repository with one passing test, one verify command, and one commit, ready for every lesson that follows."
/>

# Set up the workshop

Every lesson in this course says "from `gold-pasal`". This page creates that folder. There is no starter repository to download; you build it here, file by file, so nothing in it is a mystery later. It takes one sitting.

You need a terminal (Terminal on macOS, any shell on Linux, WSL on Windows) and about twenty minutes.

## See the idea first

Open a terminal and check what is already there:

```bash
git --version
uv --version
```

If both print a version, skip to [Create the repository](#create-the-repository). If either says `command not found`, the next section installs it.

## Install the two tools

### Git

**Git** keeps the history of your files. macOS: run `git --version` once and accept the developer tools prompt, or install from [git-scm.com](https://git-scm.com/downloads). Linux: `sudo apt install git` or your distribution's equivalent. Windows: install Git inside WSL the Linux way.

Tell Git who you are, once per machine:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### uv

**uv** installs Python, manages the project's packages, and runs every command in this course. Install it:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Close the terminal and open a new one so `PATH` picks up the install (usually `~/.local/bin`). Then:

```bash
uv --version
```

```text
uv 0.12.x (...)
```

Install the Python the shop uses:

```bash
uv python install 3.12
```

You do not install Python any other way. uv keeps its own copy and every project picks the version it needs.

## Create the repository

1. Make a folder for your projects and create the shop:

```bash
mkdir -p ~/dev
cd ~/dev
uv init --package --python 3.12 gold-pasal
cd gold-pasal
```

```text
Initialized project `gold-pasal` at `/Users/you/dev/gold-pasal`
```

`uv init --package` creates a Python package in the `src/` layout, a `pyproject.toml`, a `.gitignore`, a `.python-version` pinned to 3.12, and an empty Git repository. Look:

```bash
ls -a
```

```text
.  ..  .git  .gitignore  .python-version  README.md  pyproject.toml  src
```

2. Replace `pyproject.toml` with the shop's configuration. Open it in your editor and make it exactly this:

```toml
[project]
name = "gold-pasal"
version = "0.1.0"
description = "Production-shaped backend for a Nepal-focused jewelry store"
readme = "README.md"
requires-python = ">=3.12"
dependencies = []

[dependency-groups]
dev = [
  "pyright>=1.1.405,<2",
  "pytest>=8.4,<9",
  "pytest-cov>=6.2,<7",
  "ruff>=0.12,<1",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/gold_pasal"]

[tool.pytest.ini_options]
addopts = "-ra --strict-markers"
testpaths = ["tests"]

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF"]

[tool.pyright]
pythonVersion = "3.12"
typeCheckingMode = "strict"
include = ["src", "tests"]
```

You will understand every section by the end of R1. For now: `[dependency-groups] dev` lists the four developer tools; `[tool.pytest...]`, `[tool.ruff]`, and `[tool.pyright]` configure the test runner, the linter and formatter, and the type checker.

3. Replace `src/gold_pasal/__init__.py`:

```python
"""Gold Pasal application package."""

__version__ = "0.1.0"
```

4. Create `tests/test_setup.py`:

```python
import gold_pasal


def test_given_fresh_checkout_when_package_is_imported_then_setup_is_ready() -> None:
    assert gold_pasal.__version__ == "0.1.0"
```

This is the **smoke test**: the smallest check that the package can be imported. It proves the workshop opens, nothing more.

5. Create `scripts/verify.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

uv run ruff check .
uv run ruff format --check .
uv run pyright
uv run pytest -m "not integration" --cov=gold_pasal --cov-report=term-missing
```

Make it executable:

```bash
chmod +x scripts/verify.sh
```

This one script is the shop's quality gate. Every release ends by running it.

6. Replace `.gitignore`:

```text
.venv/
__pycache__/
*.py[cod]
.pytest_cache/
.ruff_cache/
.mypy_cache/
.hypothesis/
.coverage
htmlcov/
.env
.env.*
!.env.example
dist/
build/
*.egg-info/
.DS_Store
```

`.env` is where secrets will live from R4 on. It is ignored here, on day one, so it can never be committed by accident.

7. Create `.env.example`:

```text
# Add documented, non-secret configuration keys when a release introduces them.
# Copy this file to .env for local values; .env is intentionally ignored by Git.
```

8. Create `.github/workflows/ci.yml`:

```yaml
name: application-ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv python install 3.12
      - run: uv sync --frozen --all-groups
      - run: ./scripts/verify.sh
```

If you later push to GitHub, this runs `verify.sh` on every push. It does nothing until then. You do not need GitHub to finish R0.

9. Replace `README.md` with a few lines:

```markdown
# Gold Pasal

The learner-owned workspace for a production-shaped Nepal jewelry store backend.
Lessons live in the Gold Pasal course; type every command in this folder.

    uv sync --all-groups
    ./scripts/verify.sh
```

## Install and verify

From `gold-pasal`:

```bash
uv sync --all-groups
```

```text
Resolved 12 packages in ...
...
 + ruff==0.x.x
```

`uv sync` creates `.venv/` with Python 3.12 and the four dev tools, installs your package into it, and writes `uv.lock`, the exact list of versions. Commit `uv.lock`; never edit it by hand.

Now the gate:

```bash
./scripts/verify.sh
```

```text
All checks passed!
1 file already formatted
0 errors, 0 warnings, 0 informations
...
tests/test_setup.py .                                                    [100%]
...
TOTAL                            1      0   100%
============================== 1 passed in 0.03s ===============================
```

Four tools, four green lines. That is what "the shop is healthy" looks like for the rest of the course.

## The first commit

```bash
git add -A
git status --short
```

```text
A  .env.example
A  .github/workflows/ci.yml
A  .gitignore
A  .python-version
A  README.md
A  pyproject.toml
A  scripts/verify.sh
A  src/gold_pasal/__init__.py
A  tests/test_setup.py
A  uv.lock
```

`.venv/`, `.coverage`, and the cache folders are absent because `.gitignore` excludes them. Commit:

```bash
git commit -m "Set up the Gold Pasal workshop"
```

```text
[main (root-commit) 1fdf79e] Set up the Gold Pasal workshop
 10 files changed, ...
```

That hash is your first piece of release evidence. Later gates will ask for a commit; this is what one looks like.

::: tip Publish it when you want a backup
`gh repo create gold-pasal --private --source=. --push` (with the [GitHub CLI](https://cli.github.com/)) puts it on GitHub and starts `application-ci`. Optional today.
:::

## Open it in an editor

Any editor works. Open the `gold-pasal` folder (not `~/dev`) so the editor sees `pyproject.toml` and picks up `.venv`. In VS Code or Cursor, install the Python extension and, if asked for an interpreter, choose `.venv/bin/python` inside the project.

You will type commands in the terminal and edit files in the editor for every lesson. Keep both open.

## What you have

```text
gold-pasal/
├── .env.example          documented config keys, no values
├── .github/workflows/    application-ci, runs verify.sh on GitHub
├── .gitignore            keeps .venv, caches, and .env out of Git
├── .python-version       3.12
├── pyproject.toml        project metadata and tool configuration
├── scripts/verify.sh     the quality gate
├── src/gold_pasal/       the package; __version__ = "0.1.0"
├── tests/test_setup.py   the smoke test
└── uv.lock               exact dependency versions
```

Every later lesson adds to this tree. None of them replaces it.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `uv: command not found` after installing | The terminal has the old `PATH` | Open a new terminal; or run the `source` line the installer printed |
| `uv init` says the folder exists | You ran it twice | `cd gold-pasal`; continue from step 2 |
| `No solution found` during `uv sync` | Typo in `pyproject.toml` | Copy the listing again exactly |
| `Permission denied: ./scripts/verify.sh` | Not executable | `chmod +x scripts/verify.sh` |
| `ModuleNotFoundError: gold_pasal` in pytest | `uv sync` did not run, or ran outside the folder | `cd gold-pasal && uv sync --all-groups` |
| `Would reformat` from ruff | A file's whitespace differs from the formatter's | `uv run ruff format .` then rerun |
| `git commit` asks who you are | Name and email not configured | The two `git config --global` lines above |
| Windows without WSL | The scripts assume a Unix shell | Install WSL (Ubuntu) and do everything inside it |

## Practice

<LessonQuiz
  question="You edited src/gold_pasal/__init__.py to say __version__ = '0.2.0' and ran ./scripts/verify.sh. What happens?"
  a="All green; the version is just a label"
  b="pytest fails: test_setup.py asserts the version is 0.1.0"
  c="ruff fails on the string"
  d="uv sync reinstalls the package"
  correct="b"
>

The smoke test pins the version string. Two places must agree, `__init__.py` and the test, so a careless edit to either one turns the gate red. Put it back to `0.1.0`.

</LessonQuiz>

Next: [Run Python in gold-pasal](02-run-python-in-gold-pasal), your first REPL session and script in the folder you just built.

<EvidenceCard
  command="./scripts/verify.sh && git log --oneline"
  artifact="gold-pasal repository with pyproject.toml, verify.sh, test_setup.py, and one commit"
  invariant="A fresh machine can reproduce the environment from pyproject.toml and uv.lock alone"
/>
