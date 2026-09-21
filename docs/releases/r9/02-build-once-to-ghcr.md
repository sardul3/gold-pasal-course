---
id: r9-02
title: "Build once to GHCR"
release: r9
order: 2
prerequisites: [r9-01]
outcomes:
  - Push an image to ghcr.io/<you>/gold-pasal-api
  - Record the digest in the job summary
evidence: [ci-run]
---

<LessonMission
  role="delivery owner"
  problem="kind still runs gold-pasal-api:r7 from a laptop load. CI could build a different image than you loaded."
  destination="A workflow publishes one image to GHCR tagged with the git SHA and a digest."
/>

# Build once to GHCR

**GHCR** is GitHub's container registry. **Build once** means CI produces one image per commit; kind and later environments pull that digest. They do not rebuild. `docker/build-push-action` with `GITHUB_TOKEN` and `packages: write` is enough for a private package.

## See the idea first

From `gold-pasal`:

```bash
echo $GITHUB_REPOSITORY
```

```text
<you>/gold-pasal
```

On the laptop this may be empty. In Actions, it is set. The image name is <code v-pre>ghcr.io/${{ github.repository }}-api</code> or similar; pick one and keep it.

## Publish job

After tests pass (`needs: [unit, inventory]`):

<div v-pre>

```yaml
  publish:
    needs: [unit, inventory]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        id: build
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}-api:${{ github.sha }}
      - run: echo "${{ steps.build.outputs.digest }}"
```

</div>

Pull by digest on kind:

```bash
docker pull ghcr.io/<you>/gold-pasal-api@sha256:...
kind load docker-image ghcr.io/<you>/gold-pasal-api@sha256:... --name gold-pasal
```

Mutable tags like `:latest` are not the promotion identity. SHA tag plus digest is.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| denied packages | missing packages: write | Set job permissions |
| name invalid | uppercase repository | GHCR image names must be lowercase; use github.repository_owner and a lowered repo name |

## Practice

<LessonQuiz
  question="What identifies the bytes you will deploy?"
  a=":latest"
  b="The image digest (sha256:...)"
  c="The Dockerfile path"
  d="The kind cluster name"
  correct="b"
>

A digest is content-addressed. Rebuilding `:latest` can change bytes behind the same name.

</LessonQuiz>

Next: [Scans and provenance](03-scans-and-provenance).

<EvidenceCard
  command="gh run view --log | tail"
  artifact="GHCR package with a sha256 digest"
  invariant="One commit, one published image. Environments pull; they do not rebuild."
/>
