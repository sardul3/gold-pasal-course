---
id: r0-03
title: "Prepare the workshop"
release: r0
order: 3
prerequisites: [r0-02]
outcomes:
  - Install Git and uv, then open gold-pasal as the working directory
  - Frozen-sync Python 3.12 and prove package version 0.1.0
  - Recover from command-not-found, wrong-folder, and permission-denied failures
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend engineer"
  problem="The shop files exist, but the terminal is in the wrong folder and uv is missing, so the opening checklist cannot run."
  destination="From gold-pasal, a frozen sync and ./scripts/verify.sh both finish with exit status 0."
/>

# Prepare the workshop

All commands below are for `gold-pasal`, not `gold-pasal-course`. macOS and Linux are the documented path. On Windows, use WSL and run the same commands there.

## See the idea first

The **working directory** is the folder relative paths such as `./scripts/verify.sh` resolve against. Confirm you are there:

```bash
cd ~/dev/gold-pasal
pwd
ls pyproject.toml uv.lock scripts/verify.sh src/gold_pasal/__init__.py
```

`pwd` must end in `gold-pasal`. `ls` must print those four paths. Open that same folder in your editor (File → Open Folder).

## Install Git, then uv

```bash
git --version
```

You want a version line, for example `git version 2.50.1`. If the shell says `command not found`, on macOS run `xcode-select --install`, then open a **new** terminal.

```bash
uv --version
```

If that fails:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Open a new terminal. The installer typically puts `uv` in `~/.local/bin`. You do not need a global `ruff` or `pytest`. Those arrive through uv.

- `pyproject.toml` — project metadata and tool config.
- `uv.lock` — exact resolved package versions.
- `.venv` — local environment; must not be committed.

## Frozen sync

`--frozen` means install must match the existing lockfile. `--all-groups` includes the development tools used by verification.

```bash
uv python install 3.12
uv sync --frozen --all-groups
```

Expected: `Python 3.12 is already installed` or a short install log, then `Checked N packages` and exit status `0`. Do not add dependencies.

## Prove this Python

```bash
uv run python -c "import sys; print(sys.version_info[:2])"
uv run python -c "import gold_pasal; print(gold_pasal.__version__)"
git status --short
```

Expected:

```text
(3, 12)
0.1.0
```

Then:

```bash
uv run pytest tests/test_setup.py -q
```

Expected: a `.`, `1 passed`, exit status `0`. Times differ.

`uv run` starts the command inside this project's environment. A globally installed pytest can hide a missing locked dependency.

## Practice

```bash
./scripts/verify.sh
```

You should see Ruff `All checks passed!`, Pyright `0 errors`, one passing pytest, and exit status `0`. If the script is not executable: `chmod +x scripts/verify.sh` and rerun.

<LessonQuiz
  question="If pyproject.toml and uv.lock disagree, what should a frozen sync do?"
  a="Rewrite uv.lock so the laptop matches pyproject.toml"
  b="Fail and leave the lockfile unchanged"
  c="Warn, then continue with the old lockfile"
  d="Update pyproject.toml to match uv.lock"
  correct="b"
>

Fail. `--frozen` refuses to invent a resolution you have not reviewed.

</LessonQuiz>

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `No such file or directory` for `./scripts/verify.sh` | Wrong folder | `cd` to the folder that contains `scripts/verify.sh` |
| `command not found: uv` | uv missing, or PATH missing `~/.local/bin` | Reinstall, open a new terminal |
| `command not found: ruff` | ruff is not a global tool | Use `uv run` or `./scripts/verify.sh` |
| `Permission denied` | Executable bit missing | `chmod +x scripts/verify.sh` |
| Frozen sync error about the lockfile | `pyproject.toml` and `uv.lock` disagree | Stop. Do not run an unfrozen sync |

Next: [The first program](04-run-inspect-and-debug-the-first-python-program).

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="Python 3.12 from uv, version 0.1.0, exit status 0, unchanged uv.lock"
  invariant="a new engineer can reproduce the environment without private machine state"
/>
