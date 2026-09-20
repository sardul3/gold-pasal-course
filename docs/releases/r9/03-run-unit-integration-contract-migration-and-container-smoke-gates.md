---
id: r9-03
title: "Run unit, integration, contract, migration, and container smoke gates"
release: r9
order: 3
prerequisites: [r9-02]
outcomes:
  - Apply run unit, integration, contract, migration, and container smoke gates to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Run unit, integration, contract, migration, and container smoke gates


One green unit suite cannot prove PostgreSQL integration, HTTP compatibility, migration safety, or that the packaged container starts. Give each failure boundary a gate and block publication until all required gates succeed.

## See the idea first

- Unit tests run focused pytest modules without network dependencies.
- Integration tests exercise the FastAPI app against a real compatible PostgreSQL service.
- Contract tests protect public request and response models through the ASGI/HTTP seam.
- Migration tests run Alembic against an old schema and exercise old/new compatibility.
- Container smoke starts the exact candidate image and calls `/health`, then `/ready` when its dependencies are available.

```bash
uv sync --locked
uv run pytest tests/unit
uv run pytest tests/integration tests/contract
uv run alembic upgrade head
```

```yaml
jobs:
  publish:
    needs: [unit, integration, contract, migration, container-smoke]
    if: github.event_name != 'pull_request'
```

Use PostgreSQL health checks and explicit timeouts for service containers. A fixed `sleep 30` is both slow and flaky. Run the container with the same Python 3.12/FastAPI entrypoint used in production, and poll `/health` within a bound. Upload focused pytest and Alembic reports on failure, but redact environment variables and credentials.

<FailureWorkbench incident="Tests pass, but the published container exits in the homelab." :hypotheses="['container smoke tested a different artifact', 'required runtime config was absent', 'image architecture differs']" next-evidence="Compare image IDs and the exact docker run command from the smoke job." />

## Practice

Introduce a backward-incompatible training migration. Confirm only the migration gate reports the relevant failure and publication is skipped. Restore compatibility and rerun.

<PredictThenRun prompt="Which defect class belongs to each gate, and which later gate must not run after a prerequisite fails?">

</PredictThenRun>

## Public evidence

```bash
gh run watch --exit-status
gh run view --json jobs,headSha,conclusion
```

Publish the job matrix tied to one commit SHA and the container smoke output tied to the candidate image ID.

<EvidenceCard
  command="gh run watch --exit-status"
  artifact="a PR, green workflow, image digest, GitOps diff, and deployment smoke result"
  invariant="build once, promote by digest, and roll back through reviewed Git history"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a PR, green workflow, image digest, GitOps diff, and deployment smoke result"
  interview-question="Why prefer pull-based GitOps for a private homelab?"
/>
