---
id: r9-01
title: "Turn the local quality command into GitHub Actions jobs"
release: r9
order: 1
prerequisites: []
outcomes:
  - Apply turn the local quality command into github actions jobs to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Turn the local quality command into GitHub Actions jobs


The command that protects a laptop must protect every pull request. Split Gold Pasal's local quality contract into visible GitHub Actions jobs so reviewers can see which boundary failed and branch protection can require the right checks.

## See the idea first

```yaml
on:
  pull_request:
permissions:
  contents: read
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pinned-commit>
      - uses: actions/setup-python@<pinned-commit>
        with:
          python-version: "3.12"
      - uses: astral-sh/setup-uv@<pinned-commit>
        with:
          enable-cache: true
      - name: Run the repository quality command
        run: uv run pytest
```

Pin third-party actions to reviewed commits. `uv run` creates or reuses the locked Python 3.12 environment before invoking pytest. Keep default permissions read-only and grant package write only to the publishing job. A job should start from a clean checkout and `uv.lock`; otherwise it only proves a warm developer machine works.

Name jobs for branch protection, and use `needs` to prevent image publication until required tests pass. Do not give GitHub a homelab kubeconfig: CI will publish artifacts, while Argo CD pulls approved state from inside the private network.

<FailureWorkbench incident="CI is green while the local quality command fails." :hypotheses="['workflow skipped a module', 'different runtime or lockfile path', 'failure was hidden with continue-on-error']" next-evidence="Compare the exact commands, versions, working directories, and exit codes." />

## Practice

Open a training PR that breaks one formatting or unit check. Verify the named job fails, later publication jobs do not run, and the PR cannot merge. Restore it and watch the same commit become green.

<PredictThenRun prompt="Which required job should fail, which downstream jobs should skip, and what exit status proves the gate worked?">

</PredictThenRun>

## Public evidence

```bash
gh run watch --exit-status
gh run view --log-failed
```

Link both the intentional red run and corrected green run. Logs must show commands and outcomes without printing secrets.

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
