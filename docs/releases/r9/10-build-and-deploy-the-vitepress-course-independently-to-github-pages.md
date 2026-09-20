---
id: r9-10
title: "Build and deploy the VitePress course independently to GitHub Pages"
release: r9
order: 10
prerequisites: [r9-09]
outcomes:
  - Apply build and deploy the vitepress course independently to github pages to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

# Build and deploy the VitePress course independently to GitHub Pages


The course site and Gold Pasal API have different release boundaries. Publish VitePress to GitHub Pages with its own permissions and concurrency, without rebuilding the API image or waiting for homelab access.

## See the idea first

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
```

The build job installs locked dependencies, runs link/content checks, builds VitePress with the repository's correct base path, and uploads the Pages artifact. The deploy job uses the protected `github-pages` environment and only that artifact.

```yaml
jobs:
  deploy-pages:
    needs: build-pages
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
```

Keep API publishing credentials and cluster concerns out of this workflow. A docs-only change should not mint a new GHCR digest.

<FailureWorkbench incident="Pages deploy succeeds, but lesson links and assets return 404." :hypotheses="['VitePress base path is wrong', 'build artifact root is wrong', 'case-sensitive route differs']" next-evidence="Inspect the built artifact paths and request the deployed URL, not localhost." />

## Practice

Add a temporary broken internal link. Confirm the build gate fails and no Pages deployment occurs. Restore the link and verify a lesson URL plus one static asset.

<PredictThenRun prompt="Which jobs should run for a docs-only change, and which API release artifacts must remain unchanged?">

</PredictThenRun>

## Public evidence

```bash
gh run watch --exit-status
curl --fail --show-error https://<owner>.github.io/<repository>/
```

Link the source commit, Pages run, deployed URL, and successful route check. Keep this evidence independent of homelab smoke results.

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
