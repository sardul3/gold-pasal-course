---
id: r4-01
title: "Run PostgreSQL with Docker Compose"
release: r4
order: 1
prerequisites: []
outcomes:
  - Start PostgreSQL 16 from a compose.yaml in the shop
  - Connect with psql and run one query
  - Keep DATABASE_URL in .env and document it in .env.example
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory lead"
  problem="Every catalog item vanishes when uvicorn restarts. The shop needs a database, and installing one by hand differs on every laptop."
  destination="docker compose up starts PostgreSQL 16 on port 5432, psql connects to it, and DATABASE_URL lives in an ignored .env file."
/>

# Run PostgreSQL with Docker Compose

**PostgreSQL** is the relational database this shop uses. **Docker** runs it in a container: an isolated process with its own filesystem, started from an image, identical on every machine. **Docker Compose** describes the containers a project needs in one file, `compose.yaml`, so "start the database" is one command.

## See the idea first

From `gold-pasal`, confirm Docker is installed and running:

```bash
docker --version
docker compose version
```

```text
Docker version 27.x.x, build ...
Docker Compose version v2.x.x
```

If either fails, install [Docker Desktop](https://docs.docker.com/get-docker/) (macOS, Windows) or Docker Engine (Linux) and start it. Then continue.

## compose.yaml

Create `compose.yaml` at the shop root:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: gold
      POSTGRES_PASSWORD: gold
      POSTGRES_DB: gold_pasal
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gold -d gold_pasal"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
```

| Key | Means |
| --- | --- |
| `image: postgres:16` | the official PostgreSQL 16 image from Docker Hub |
| `environment` | the first user, password, and database the image creates on first start |
| `ports: "5432:5432"` | expose the container's port 5432 on your laptop's 5432 |
| `volumes: pgdata` | a named volume so data survives `docker compose down` |
| `healthcheck` | how Docker knows the database is ready to accept connections |

`gold`/`gold` is a local development password. It never leaves this laptop and never appears in production configuration; R7 and R8 own those.

Start it:

```bash
docker compose up -d db
```

```text
[+] Running 2/2
 ✔ Volume "gold-pasal_pgdata"  Created
 ✔ Container gold-pasal-db-1   Started
```

`-d` runs it in the background. The first run downloads the image, which takes a minute. Check it is healthy:

```bash
docker compose ps
```

```text
NAME               IMAGE         ...   STATUS                    PORTS
gold-pasal-db-1    postgres:16   ...   Up 20 seconds (healthy)   0.0.0.0:5432->5432/tcp
```

Wait for `(healthy)` before connecting.

## Connect with psql

**psql** is PostgreSQL's command-line client. It is inside the container, so run it there:

```bash
docker compose exec db psql -U gold -d gold_pasal
```

```text
psql (16.x)
Type "help" for help.

gold_pasal=#
```

That is the SQL prompt. Ask the server its version:

```sql
SELECT version();
```

```text
                          version
-----------------------------------------------------------
 PostgreSQL 16.x (Debian ...) on aarch64-unknown-linux-gnu ...
(1 row)
```

SQL statements end with `;`. Two psql commands you will use constantly:

| Command | Does |
| --- | --- |
| `\dt` | list tables (none yet) |
| `\q` | quit |

Leave psql with `\q`. The next page spends its whole time at this prompt.

## DATABASE_URL

Python connects with a URL that names the driver, user, password, host, port, and database:

```text
postgresql+psycopg://gold:gold@localhost:5432/gold_pasal
```

`postgresql+psycopg` is "PostgreSQL through the psycopg driver", the name SQLAlchemy understands on the next pages. `localhost:5432` is the port Compose exposed.

Put it in `.env` at the shop root:

```bash
echo 'DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal' > .env
```

`.env` is in `.gitignore` from [R0](/releases/r0/01-set-up-the-workshop), so this file stays on your machine. Document the key without its value in `.env.example`, which is committed:

```text
# Add documented, non-secret configuration keys when a release introduces them.
# Copy this file to .env for local values; .env is intentionally ignored by Git.
DATABASE_URL=
```

Check Git agrees:

```bash
git status --short
```

```text
?? compose.yaml
 M .env.example
```

No `.env`. If it appears, stop and fix `.gitignore` before anything else.

::: tip Loading .env
Nothing reads `.env` automatically yet. On the next pages you `export DATABASE_URL=...` in the shell, or prefix a command with it. R5 adds `pydantic-settings`, which reads `.env` for you.
:::

## Stop, start, wipe

```bash
docker compose stop db      # stop; data kept
docker compose start db     # start again
docker compose down         # remove the container; data kept in the volume
docker compose down -v      # remove the container and the volume: all data gone
```

`down -v` is the reset button when a migration experiment goes wrong. Everything on these pages can be rebuilt from Alembic, so it is safe to press.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `Cannot connect to the Docker daemon` | Docker Desktop not running | Start it; wait for the whale icon |
| `port is already allocated` | Another PostgreSQL on 5432 | Stop it, or change the left side to `"5433:5432"` and the URL port to 5433 |
| `STATUS ... (health: starting)` for a long time | First start initialising | Wait; `docker compose logs db` shows progress |
| `psql: error: connection ... failed` | Container not healthy yet, or wrong user | Wait for `(healthy)`; user is `gold` |
| `.env` shows in `git status` | `.gitignore` missing the line | Add `.env`, then `git rm --cached .env` if it was staged |
| No Docker available on this machine | Corporate laptop, or unsupported OS | Install PostgreSQL 16 natively and use the same `DATABASE_URL` with your local user |

## Practice

<LessonQuiz
  question="You run docker compose down and then docker compose up -d db. What happened to the rows you inserted?"
  a="Gone; containers are ephemeral"
  b="Kept; they live in the pgdata volume, which down leaves alone"
  c="Kept only if you ran docker compose stop first"
  d="Gone unless you exported them with pg_dump"
  correct="b"
>

The container is disposable; the named volume is not. Only `down -v` removes the volume. That split is why the data directory is mounted from a volume and not left inside the container.

</LessonQuiz>

Next: [SQL essentials on the tray](02-sql-essentials-on-the-tray), at the psql prompt.

<EvidenceCard
  command="docker compose ps"
  artifact="compose.yaml with a healthy db service; DATABASE_URL in .env; key documented in .env.example"
  invariant="The database connection string is configuration, never source code"
/>
