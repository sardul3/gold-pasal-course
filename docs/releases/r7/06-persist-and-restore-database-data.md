---
id: r7-06
title: "Persist and restore database data"
release: r7
order: 6
prerequisites: [r7-05]
outcomes:
  - Mount a named volume on Postgres data
  - Dump and restore one catalog row
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="docker compose down deletes the catalog because Postgres used an anonymous writable layer. Maya's GP-RING-001 row is gone."
  destination="A named volume keeps catalog rows across compose down/up, and you can dump and restore with pg_dump."
/>

# Persist and restore database data

A **named volume** is Docker-managed storage that outlives a container. R4's compose file should already mount one at `/var/lib/postgresql/data`. Confirm it, then prove it: insert a row, `compose down`, `compose up`, and the row is still there.

## See the idea first

From `gold-pasal`:

```bash
docker compose exec postgres psql -U gold -d gold_pasal -c '\dt'
```

```text
 public | catalog_items | table | gold
```

Table names may match your Alembic models. If compose is down, bring it up first.

## Prove the volume

```bash
docker volume ls | grep postgres
docker compose down
docker compose up --wait
docker compose exec postgres psql -U gold -d gold_pasal -c 'SELECT sku FROM catalog_items LIMIT 3;'
```

If the select is empty after down/up, the volume is not mounted. Add under `postgres`:

```yaml
    volumes:
      - gp_pgdata:/var/lib/postgresql/data
volumes:
  gp_pgdata:
```

Dump and restore:

```bash
docker compose exec postgres pg_dump -U gold gold_pasal > /tmp/gold-pasal.dump.sql
```

That file is a backup you can keep off the laptop. Restoring onto a broken volume is how you recover, not `docker compose down -v` unless you intend to wipe.

`compose down -v` removes named volumes. Do not use `-v` on a shop you care about.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| rows gone after down/up | anonymous container storage | Declare a named volume |
| permission denied in psql | wrong user | Match POSTGRES_USER from compose |

## Practice

<LessonQuiz
  question="Which flag on docker compose down deletes the catalog volume?"
  a="--wait"
  b="-v"
  c="--build"
  d="--detach"
  correct="b"
>

`-v` removes named volumes declared in the file. A normal `down` stops containers and leaves `gp_pgdata`.

</LessonQuiz>

Next: [Release gate: clean-machine stack](07-release-gate-clean-machine-stack).

<EvidenceCard
  command="docker volume ls | grep gp_pgdata"
  artifact="named volume plus a pg_dump file"
  invariant="Replacing the Postgres container does not delete catalog rows."
/>
