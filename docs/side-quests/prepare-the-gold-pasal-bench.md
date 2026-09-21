---
title: How to freeze-sync the shop
description: Install uv, sync gold-pasal, and run the starter verify command.
---

# How to freeze-sync the shop

You already have a `gold-pasal` repository (yours from [Set up the workshop](/releases/r0/01-set-up-the-workshop), or a clone of someone's) and want its environment rebuilt on this machine. This page is the recipe. If the folder does not exist yet, do the R0 setup page instead; it creates every file this page assumes.

Start in the shop folder (`pwd` ends in `gold-pasal`).

## Install uv and Python 3.12

Install [uv](https://docs.astral.sh/uv/getting-started/installation/). On macOS/Linux:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Open a new terminal so `PATH` includes uv (often `~/.local/bin`). Then:

```bash
cd gold-pasal
uv python install 3.12
uv sync --frozen --all-groups
./scripts/verify.sh
```

`--frozen` must not rewrite `uv.lock`. Use `uv run` for pytest, pyright, and ruff. Do not install a global pytest and call it from this repo.

If `./scripts/verify.sh` is not executable:

```bash
chmod +x scripts/verify.sh
```

## What green means

The starter smoke test is only:

```bash
uv run pytest tests/test_setup.py
```

It asserts `gold_pasal.__version__ == "0.1.0"`. It is not a gold quote.

GitHub Actions workflow `application-ci` runs the same verify command on `main` and on pull requests. A feature branch with no PR does not start that workflow. You do not need that workflow to finish R0.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `uv: command not found` after install | Shell still has old `PATH` | New terminal, or source the uv env file the installer printed |
| `uv sync` wants to change `uv.lock` | Missing `--frozen` | Add `--frozen`; do not commit a lockfile rewrite to "make it work" |
| `verify.sh: Permission denied` | Not executable | `chmod +x scripts/verify.sh` |
| `No such file: scripts/verify.sh` | You are not in `gold-pasal` | `cd` into `gold-pasal` |

Git, commits, and CI history are useful later. They are not what R0 asks you to leave with. Return to [Core Python](/releases/r0/).
