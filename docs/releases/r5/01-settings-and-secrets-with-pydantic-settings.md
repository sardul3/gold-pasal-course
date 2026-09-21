---
id: r5-01
title: "Settings and secrets with pydantic-settings"
release: r5
order: 1
prerequisites: []
outcomes:
  - Define a Settings class that reads environment variables and .env
  - Hold tokens as SecretStr so they never print or log
  - Replace os.environ reads with one Settings object on app.state
evidence: [commit, ci-run]
---

<LessonMission
  role="shop operations"
  problem="DATABASE_URL is read in db.py with os.environ. Two tokens are about to join it. Three scattered reads, three ways to misspell a name, and a password that prints in the first traceback."
  destination="One Settings class, validated at startup, loaded from the environment or .env, with secrets masked; create_app receives it, and tests build their own."
/>

# Settings and secrets with pydantic-settings

**Configuration** is everything that differs between your laptop, CI, and the store's server without a code change: the database URL, the tokens, later the log level. **pydantic-settings** reads it from environment variables (and, locally, from `.env`) into a validated Pydantic model. A **secret** is configuration that must not be printed, logged, or committed.

## See the idea first

From `gold-pasal`:

```bash
uv add pydantic-settings
```

Create `src/gold_pasal/settings.py`:

```python
"""Process configuration, read once from the environment (and .env locally)."""

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    database_url: str | None = None
    staff_token: SecretStr | None = Field(default=None, validation_alias="GOLD_PASAL_STAFF_TOKEN")
    customer_token: SecretStr | None = Field(
        default=None, validation_alias="GOLD_PASAL_CUSTOMER_TOKEN"
    )
```

Put values in `.env` (ignored by Git since R0):

```text
DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal
GOLD_PASAL_STAFF_TOKEN=change-me-staff
GOLD_PASAL_CUSTOMER_TOKEN=change-me-customer
```

Then, in `uv run python`, with no `DATABASE_URL` exported in the shell:

```python
>>> from gold_pasal.settings import Settings
>>> settings = Settings()
>>> settings
Settings(database_url='postgresql+psycopg://gold:gold@localhost:5432/gold_pasal', staff_token=SecretStr('**********'), customer_token=SecretStr('**********'))
```

Three values, read from `.env`, and the two tokens already masked.

## How a field is filled

| Field | Looks for | Because |
| --- | --- | --- |
| `database_url` | `DATABASE_URL` | pydantic-settings upper-cases the field name |
| `staff_token` | `GOLD_PASAL_STAFF_TOKEN` | `validation_alias` names it explicitly |
| `customer_token` | `GOLD_PASAL_CUSTOMER_TOKEN` | same |

The `GOLD_PASAL_` prefix on the tokens matches what the course's black-box checks export. `DATABASE_URL` keeps the conventional name that Alembic's `env.py` and Compose users expect.

Precedence: a real environment variable beats `.env`, which beats the default. Try it:

```python
>>> import os
>>> os.environ["GOLD_PASAL_STAFF_TOKEN"] = "from-the-environment"
>>> Settings().staff_token.get_secret_value()
'from-the-environment'
```

That is how CI and the server work: no `.env` file, only environment variables. `.env` is a laptop convenience.

`extra="ignore"` means unrelated variables in your shell (`PATH`, `HOME`) do not cause validation errors. `populate_by_name=True` lets tests build `Settings(staff_token=...)` by field name instead of the alias.

## SecretStr

```python
>>> settings.staff_token
SecretStr('**********')
>>> print(settings.staff_token)
**********
>>> settings.staff_token.get_secret_value()
'change-me-staff'
>>> settings.model_dump()
{'database_url': '...', 'staff_token': SecretStr('**********'), 'customer_token': SecretStr('**********')}
```

A `SecretStr` masks itself in `repr`, `str`, `model_dump`, and therefore in logs and tracebacks. The real value comes out only when code asks for it with `get_secret_value()`, which is a string you can search the codebase for. The [auth page](02-authenticate-with-bearer-tokens) is the one place that calls it.

`database_url` is a plain `str` here even though it contains a password. Alembic and SQLAlchemy need the whole string, and SQLAlchemy masks the password in its own error messages. If that ever feels too loose, `SecretStr` plus `get_secret_value()` at the one call site is the change.

## Validation at startup

```python
>>> Settings(database_url=123)
Traceback (most recent call last):
  ...
pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings
database_url
  Input should be a valid string
```

A misconfigured process fails while starting, with the field named, instead of an hour later on the first request. When a setting becomes required (R7 will make `database_url` required in the container), drop the `| None = None` and a missing variable stops the process at import.

## Wire it into the app

Replace the `os.environ` read. In `src/gold_pasal/db.py`, delete `database_url_from_env` and the `import os`. In `src/gold_pasal/api/app.py`:

```python
from gold_pasal.settings import Settings


def create_app(
    *,
    settings: Settings | None = None,
    session_factory: sessionmaker[Session] | None = None,
    catalog: CatalogRepository | None = None,
    inventory: InventoryRepository | None = None,
    clock: Clock = utc_now,
) -> FastAPI:
    app = FastAPI(title="Gold Pasal", version=__version__)
    app.state.settings = settings if settings is not None else Settings()
    ...


def app_from_env() -> FastAPI:
    """What uvicorn runs: PostgreSQL when DATABASE_URL is set, memory otherwise."""
    settings = Settings()
    if settings.database_url is None:
        return create_app(settings=settings)
    engine = make_engine(settings.database_url)
    return create_app(settings=settings, session_factory=make_session_factory(engine))
```

`Settings()` is constructed once per process, in `app_from_env`, and stored on `app.state` so dependencies can reach it. Tests pass their own `Settings(...)` into `create_app` and never touch `.env`.

Because `Settings` reads `.env`, the `export DATABASE_URL=...` from R4 is no longer needed to start uvicorn:

```bash
uv run uvicorn gold_pasal.api.app:app --port 8000
```

Alembic still reads `os.environ["DATABASE_URL"]` in `env.py`, so keep the export for migration commands, or run them as `uv run --env-file .env alembic upgrade head`.

Update `.env.example` to document every key with no value:

```text
# Copy this file to .env for local values; .env is intentionally ignored by Git.
DATABASE_URL=
GOLD_PASAL_TEST_DATABASE_URL=
GOLD_PASAL_STAFF_TOKEN=
GOLD_PASAL_CUSTOMER_TOKEN=
```

```bash
git status --short
```

`.env.example` modified; no `.env`. If `.env` ever appears here, `git rm --cached .env` before committing anything else.

## Generate real tokens

`change-me-staff` is a placeholder. A bearer token should be long and random:

```python
>>> import secrets
>>> secrets.token_urlsafe(32)
'HiOgr7WQ-GBKKn6O0ave6SH1u2Q1y-6vLfBYPJs_C-4'
```

Put two of those in `.env`. Do not paste them into a lesson, a README, a test, or a chat. Tests use fixed strings like `test-staff-token` because a test's tokens guard nothing.

::: warning What counts as a secret
Tokens, passwords, API keys, private keys, connection strings with passwords. Not: the service name, a port, a feature flag. Secrets go in `.env` locally and in the platform's secret store later (R8 uses Kubernetes Secrets). Everything else can be a plain setting or even a constant.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `Settings()` has `database_url=None` though `.env` exists | Wrong working directory | `.env` is read relative to where the process starts; run from `gold-pasal` |
| `ValidationError: Extra inputs are not permitted` | `extra="ignore"` missing | Add it to `model_config` |
| `No parameter named "staff_token"` from pyright in a test | `populate_by_name` missing | Add `populate_by_name=True` |
| Token prints in a log | Code logged `get_secret_value()` | Log the `SecretStr` (masked) or nothing |
| `KeyError: 'DATABASE_URL'` from Alembic | Alembic does not read `.env` | `export` it, or `uv run --env-file .env alembic ...` |
| `.env` in `git status` | Ignore rule missing | It is in R0's `.gitignore`; restore the line |

## Practice

<LessonQuiz
  question="GOLD_PASAL_STAFF_TOKEN is set both in .env and as a real environment variable with different values. Which one does Settings() use?"
  a="The .env value; files beat the environment"
  b="The environment variable; it has higher precedence than .env"
  c="Neither; pydantic-settings raises on conflicts"
  d="Whichever was set most recently"
  correct="b"
>

Environment variables override `.env`. That is what lets CI and servers run without a file while your laptop keeps one, and what let the REPL example switch the token by setting `os.environ`.

</LessonQuiz>

Next: [Authenticate with bearer tokens](02-authenticate-with-bearer-tokens), where `staff_token` and `customer_token` start doing work.

<EvidenceCard
  command="uv run python -c 'from gold_pasal.settings import Settings; print(Settings())'"
  artifact="settings.py with Settings and two SecretStr tokens; app.state.settings; .env.example listing every key"
  invariant="Configuration is read once, validated at startup, and secrets never print"
/>
