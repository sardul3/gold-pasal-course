---
id: r0-07
title: "Release gate: first CI check"
release: r0
order: 7
prerequisites: [r0-06]
outcomes:
  - Match each ./scripts/verify.sh block to uv run ruff, ruff format, pyright, and pytest
  - Push the shop so application-ci runs on main or on a pull request
  - Present the commit SHA, Actions URL, verify job, and setup test node
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="new backend engineer"
  problem="A green laptop still cannot prove the workshop to a reviewer, because GitHub has never run the same checklist on this SHA."
  destination="application-ci is green for a commit another engineer can check out, and you can explain that this is setup only."
/>

# Release gate: first CI check

Work in `gold-pasal`. You need a GitHub account. Can another engineer reproduce the starter from committed files?

## See the idea first

Open `.github/workflows/ci.yml`. The workflow **name** is `application-ci`.

It runs on every **pull request** and every **push to `main`**. A push to a feature branch with no pull request does not start this workflow.

The job is named `verify`. It checks out the repository, installs the uv version pinned in the file, installs Python 3.12, runs `uv sync --frozen --all-groups`, then runs `./scripts/verify.sh`.

## Match the script to four tools

Open `scripts/verify.sh`. It starts with `set -euo pipefail`, then runs through uv:

1. `uv run ruff check .` — lint. Success: `All checks passed!`
2. `uv run ruff format --check .` — formatting. Success: `N files already formatted`
3. `uv run pyright` — types. Success: `0 errors`
4. `uv run pytest -m "not integration" --cov=gold_pasal --cov-report=term-missing` — tests

Typing `ruff check .` without `uv run` often prints `command not found`. Use the script.

## Rehearse, then the real test

Do not edit repository files.

```bash
uv run python -c "import gold_pasal; assert gold_pasal.__version__ == '9.9.9'"
```

<LessonQuiz
  question="For a false version assertion, what exception and exit status appear, and what happens to the setup test?"
  a="AssertionError, exit status 1; the setup test also fails"
  b="AssertionError, exit status 1; the setup test still passes"
  c="SystemExit, exit status 0; the setup test still passes"
  d="The one-liner is the same as a failing test file"
  correct="b"
>

`AssertionError`, exit status `1`. The setup test still asserts `"0.1.0"`.

</LessonQuiz>

```bash
uv run pytest tests/test_setup.py -vv
./scripts/verify.sh
```

Both should pass.

## Commit only if Git still has no snapshot

If `git log --oneline -5` already shows commits and `git status --short` is clean, skip to **Publish**. If Git has no commits or shop files are still `??`:

```bash
git status --short --branch
uv run pytest tests/test_setup.py
git add README.md pyproject.toml uv.lock src tests scripts .github .gitignore .env.example
git diff --staged
git commit -m "$(cat <<'EOF'
chore: record the reproducible workshop starter

EOF
)"
```

Confirm `.env` is not in the list.

## Publish

1. On GitHub, create an empty repository named `gold-pasal` (no README, no `.gitignore`, no license).
2. Copy the HTTPS remote.
3. From `gold-pasal`:

```bash
git remote add origin https://github.com/<your-account>/gold-pasal.git
git branch -M main
git push -u origin main
```

If `origin` already exists, use `git push -u origin main`.

4. GitHub → **Actions** → `application-ci` → the run for your commit → `verify` job green. Find `uv sync --frozen --all-groups`, `./scripts/verify.sh`, and `test_given_fresh_checkout_when_package_is_imported_then_setup_is_ready`.

Copy the run URL and `git rev-parse HEAD`.

If Actions never starts, push `main` or open a pull request, and enable workflows if GitHub asks.

## Practice

Match each `./scripts/verify.sh` output block to one `uv run` command above. Predict: if `uv.lock` does not match `pyproject.toml`, frozen sync fails and verification never starts.

## Check

```bash
./scripts/verify.sh
git status --short
git rev-parse HEAD
```

Show exit status `0`, a clean `git status`, and a green `application-ci` run for the same SHA. A laptop screenshot is not that pair.

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="commit SHA plus green application-ci URL for that SHA"
  invariant="a new engineer can reproduce the environment without private machine state"
/>
