---
id: r9-02
title: "Cache dependencies without hiding reproducibility problems"
release: r9
order: 2
prerequisites: [r9-01]
outcomes:
  - Apply cache dependencies without hiding reproducibility problems to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Cache dependencies without hiding reproducibility problems


Caching should make Gold Pasal CI faster, never decide which dependencies are installed. Lockfiles remain the source of truth; a cache is a disposable copy addressed by runner, toolchain, and lockfile hash.

## See the idea first

```yaml
- uses: actions/cache@<pinned-commit>
  with:
    path: ~/.cache/uv
    key: ${{ runner.os }}-python-3.12-uv-${{ hashFiles('uv.lock') }}
```

Cache uv's downloaded artifacts, not `.venv` or a mutable working tree. CI must still run `uv sync --locked` or a locked `uv run` command. Avoid broad restore keys that let a changed `uv.lock` silently reuse incompatible content.

A reproducibility check starts from no cache:

```bash
gh workflow run <workflow> -f disable_cache=true
gh run watch --exit-status
```

If the workflow cannot support an input, change the cache key and observe a miss. The same commit should produce the same test result on miss and hit.

<FailureWorkbench incident="A warm run passes but a cold run cannot resolve dependencies." :hypotheses="['lockfile is incomplete', 'workflow cached installed outputs', 'build reaches an undeclared repository']" next-evidence="Compare cache-hit output and dependency installation logs from the same commit." />

## Practice

Change a dependency constraint in `pyproject.toml` without updating `uv.lock`. `uv sync --locked` must fail even if a previous uv cache exists. Then update the lockfile and verify the key changes.

<PredictThenRun prompt="Which key segment changes for an OS change, toolchain change, and lockfile change?">

</PredictThenRun>

## Public evidence

```bash
gh run watch --exit-status
```

Keep one cold and one warm run for the same commit. Show cache status, lockfile hash, and equal test outcomes; timing alone is not reproducibility evidence.

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
