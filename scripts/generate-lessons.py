"""Generate the initial lesson briefs from the typed course map.

The generated pages are intentionally structured teaching briefs, not disposable
placeholders. Authors may deepen them in place; rerunning requires --force.
"""

from __future__ import annotations

import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_DATA = ROOT / ".vitepress/theme/data/course.ts"
RELEASES_ROOT = ROOT / "docs/releases"


@dataclass(frozen=True)
class Profile:
    role: str
    problem: str
    destination: str
    example: str
    seam: str
    command: str
    artifact: str
    invariant: str
    practice: str
    interview: str


PROFILES = {
    "r0": Profile(
        "new backend engineer",
        "The quote desk works on one laptop, but nobody can reproduce its Python setup.",
        "A clean checkout runs the same command and reports the same result.",
        "Two shells that report different Python versions can install different dependency builds even when the source is identical.",
        "the repository verification command",
        "./scripts/verify.sh",
        "a small commit plus the first green CI run",
        "a new engineer can reproduce the environment without private machine state",
        "break one environment assumption, read the error, then repair it without deleting unrelated work",
        "How do you make a Python development environment reproducible?",
    ),
    "r1": Profile(
        "counter salesperson",
        "A customer asks why an 11.6638038 g, 22K ornament has this NPR total.",
        "The CLI prints a quote whose inputs and components can be checked by hand.",
        "At NPR 200,000 per tola, one tola of 22K gold starts with 200,000 × 22 ÷ 24 before making charge, wastage, and VAT.",
        "the pricing CLI",
        "uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500",
        "a commit containing the CLI behavior and its printed quote",
        "the same explicit inputs always produce the same itemized quote",
        "change the weight to 5.00 g, calculate the direction of every line first, then run the CLI",
        "Why should money use Decimal instead of binary floating point?",
    ),
    "r2": Profile(
        "pricing policy owner",
        "A rounding change fixes one quote but silently changes another purity and charge combination.",
        "Tests state pricing invariants before refactoring changes the implementation.",
        "For any positive rate and weight, increasing purity from 18K to 22K must not lower the gold-value component.",
        "the exported pricing service",
        "uv run pytest tests/unit/pricing -q",
        "a red-to-green test commit and the pricing decision record",
        "domain rules remain framework-free, explicit, and auditable",
        "add one edge case that would fail if rounding happened before VAT, then make it pass",
        "Which pricing rules belong in value objects, policies, and application services?",
    ),
    "r3": Profile(
        "catalog manager",
        "Staff and future clients need a stable way to create and find catalog items.",
        "The documented HTTP contract validates input and returns consistent success and failure shapes.",
        "A request for SKU GP-RING-001 with purity 22 and weight 5.20 g either creates one catalog item or returns a precise client error.",
        "the OpenAPI HTTP contract",
        "uv run pytest tests/http -q",
        "an OpenAPI diff, HTTP tests, and a curl transcript",
        "transport validation cannot bypass domain invariants or leak stack traces",
        "send one invalid purity and predict the status, media type, and problem fields before running the request",
        "Why keep Pydantic request models separate from domain objects?",
    ),
    "r4": Profile(
        "inventory manager",
        "Two staff members try to reserve the same serialized necklace at nearly the same time.",
        "Exactly one active hold commits and the loser receives an expected conflict.",
        "If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it.",
        "a real PostgreSQL transaction",
        "uv run pytest tests/integration/inventory -q",
        "a migration plus a passing concurrent-reservation integration test",
        "one physical item cannot have two active holds",
        "run the race repeatedly, then explain which database constraint or lock—not timing luck—protects the item",
        "Where should transaction boundaries live, and why?",
    ),
    "r5": Profile(
        "store operations lead",
        "A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders.",
        "Writes are replay-safe, role-scoped, and recorded in an append-only audit trail.",
        "Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once.",
        "the authenticated order API",
        "uv run pytest tests/http/orders tests/security -q",
        "authorization tests, an audit sample, and an idempotency demonstration",
        "retries do not duplicate effects and principals cannot cross ownership boundaries",
        "replay a successful request with the same key and then with changed content; explain both outcomes",
        "How do authentication, authorization, ownership, and audit differ?",
    ),
    "r6": Profile(
        "on-call engineer",
        "An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it.",
        "Layered tests and telemetry narrow the failure without guesswork.",
        "A request ID connects the 503 response, structured application log, database span, and alert event for the same order attempt.",
        "the observable order journey",
        "./scripts/verify.sh",
        "a diagnostic trace, focused regression test, and short postmortem",
        "tests and telemetry cover different risks and remain deterministic",
        "start from one symptom, write three hypotheses, and request the cheapest discriminating evidence first",
        "What belongs in a unit, slice, integration, or contract test?",
    ),
    "r7": Profile(
        "release engineer",
        "The API works in a developer shell but starts as root and depends on unrecorded machine state.",
        "One small image runs predictably with explicit configuration and health behavior.",
        "A fresh machine can start the API and PostgreSQL from committed manifests without copying a local virtual environment.",
        "the container entrypoint and health contract",
        "docker compose up --build --wait",
        "an image digest, SBOM, scan result, and clean-machine smoke transcript",
        "the image is immutable, non-root, and contains no development secrets",
        "make the database unavailable and distinguish startup, readiness, and liveness outcomes",
        "What makes a container image reproducible and safe to promote?",
    ),
    "r8": Profile(
        "platform operator",
        "A new API image must roll out without dropping healthy traffic or hiding an invalid configuration.",
        "kind converges to a constrained workload and exposes a tested rollback path.",
        "A pod with a failing readiness probe receives no Service traffic while the previous ReplicaSet remains available.",
        "the Kubernetes workload status",
        "kubectl apply -f deploy/kind/ && kubectl rollout status deployment/gold-pasal-api",
        "rendered manifests, rollout status, and rollback evidence",
        "unready workloads receive no traffic and credentials stay outside Git",
        "cause one safe probe failure, inspect Events and endpoints, then restore the prior revision",
        "How do readiness, liveness, requests, limits, and rollout strategy interact?",
    ),
    "r9": Profile(
        "delivery owner",
        "A reviewed commit needs a traceable route to a running image without kubectl set image from CI.",
        "CI publishes one digest; Git records it; kind runs it; rollback is the previous digest.",
        "The promoted manifest names a GHCR digest; rerunning CI cannot replace the bytes behind that digest.",
        "the commit-to-cluster provenance chain",
        "gh run watch --exit-status",
        "a PR, green workflow, image digest, apply, and smoke result",
        "build once, promote by digest, and roll back through reviewed Git history",
        "trace one running pod back to its image digest and source commit, then rehearse a rollback",
        "Why promote by digest instead of rebuilding on the cluster?",
    ),
    "r10": Profile(
        "online shopper",
        "A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details.",
        "A local assistant retrieves catalog facts, returns structured output, and admits missing evidence.",
        "For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source.",
        "the assistant evaluation set",
        "uv run pytest tests/evals/assistant -q",
        "versioned prompts, recorded fixtures, metrics, and one failure analysis",
        "probabilistic text cannot override deterministic catalog truth",
        "remove the relevant catalog document and predict retrieval, answer, and fallback metrics separately",
        "How do you evaluate retrieval separately from generation?",
    ),
    "r11": Profile(
        "staff assistant operator",
        "A model can search and propose a hold, but it must stop before an unapproved inventory change.",
        "Typed tools, budgets, approvals, and durable state make every run bounded and inspectable.",
        "A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping.",
        "the recorded agent trajectory",
        "uv run pytest tests/evals/agent -q",
        "golden trajectories, traces, and a denied-action demonstration",
        "stop conditions and approval states are enforced by code outside the model",
        "force a tool timeout and show the exact bounded retry and terminal run state",
        "When is a deterministic workflow better than an agent?",
    ),
    "r12": Profile(
        "MCP client integrator",
        "A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access.",
        "A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy.",
        "tools/list advertises catalog_search; an invalid purity argument is rejected before any HTTP request leaves the server.",
        "the MCP JSON-RPC contract",
        "uv run pytest tests/mcp -q",
        "Inspector evidence, protocol fixtures, and a safe failure transcript",
        "protocol handlers validate and authorize but never duplicate business rules",
        "send one malformed request and one domain conflict; explain why their error shapes differ",
        "Where do MCP protocol, authorization, and business validation boundaries belong?",
    ),
    "r13": Profile(
        "forward-deployed engineer",
        "The product works on Gold Pasal's catalog. The customer has a CSV export and a quirky HTTP API.",
        "An adapter, a demo a non-engineer can watch, and a runbook someone else can follow.",
        "Mandala item_code maps to SKU MT-{code}; tola weights convert with the R1 constant before they enter Weight.",
        "the customer integration",
        "uv run pytest tests/adapters/test_mandala.py tests/http/test_demo.py -q",
        "discovery note, adapter, HTMX demo, runbook, and stakeholder script",
        "customer constraints stay visible in the write-up and the running system",
        "show the mapping table, a live search, an unknown SKU, and one failure from the runbook",
        "How do you integrate a messy customer system without forking your product?",
    ),
    "r14": Profile(
        "job candidate",
        "A reviewer has limited time and needs evidence of judgment, not a tour of every file.",
        "A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety.",
        "A ten-minute walkthrough starts from an inventory invariant, proves it through the API, then traces the digest and the Mandala demo.",
        "the end-to-end portfolio narrative",
        "./scripts/verify.sh",
        "curated ADRs, CI/deployment evidence, demo script, and honest resume bullets",
        "every claim in the presentation points to inspectable evidence and names its limits",
        "record a ten-minute walkthrough, remove any claim you cannot prove, and answer one adversarial trade-off question",
        "Which decision best demonstrates your engineering judgment, and what would make you revisit it?",
    ),
}


def slugify(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")


def parse_course() -> list[tuple[str, str, str, list[str]]]:
    source = COURSE_DATA.read_text()
    pattern = re.compile(
        r"id: '(r\d+)',\s+title: '([^']+)',\s+promise: '([^']+)',.*?"
        r"lessons\('\1', \[(.*?)\]\s*(?:,\s*\[[^\]]+\])?\),",
        re.DOTALL,
    )
    releases = []
    for release_id, title, promise, raw_titles in pattern.findall(source):
        titles = re.findall(r"'([^']+)'", raw_titles)
        releases.append((release_id, title, promise, titles))
    if len(releases) != 15:
        raise RuntimeError(f"Expected 15 releases, parsed {len(releases)}")
    return releases


def component_for(release_id: str) -> str:
    number = int(release_id[1:])
    components = []
    if number <= 3:
        components.append(
            '<JavaBridge java="A typed Spring boundary makes dependencies visible." '
            'python="Type hints and small explicit functions make the same contract visible." '
            'caution="Python enforces many type hints through tools and tests, not the runtime by default." />'
        )
    if release_id in {"r1", "r2"}:
        components.append("<PriceWorkbench />")
    if release_id == "r3":
        components.append("<ApiWorkbench />")
    if 2 <= number <= 6:
        components.append(
            f'<TestMatrix unit="{PROFILES[release_id].invariant}" '
            f'slice="{PROFILES[release_id].seam}" '
            'integration="Use a real collaborator only where its behavior changes the risk." />'
        )
    if number >= 4:
        components.append(
            f'<FailureWorkbench incident="{PROFILES[release_id].problem}" '
            ':hypotheses="[\'invalid input\', \'boundary failure\', \'state or concurrency defect\']" '
            f'next-evidence="{PROFILES[release_id].example}" />'
        )
    return "\n\n".join(components)


def lesson_page(
    release_id: str,
    title: str,
    order: int,
    count: int,
) -> str:
    profile = PROFILES[release_id]
    lesson_id = f"{release_id}-{order:02d}"
    prerequisite = "[]" if order == 1 else f"[{release_id}-{order - 1:02d}]"
    is_gate = title.startswith("Release gate:")
    evidence = "[commit, ci-run, demo]" if is_gate else "[commit, ci-run]"
    progression = (
        "This is the release gate. Run the complete path, include the controlled "
        "failure, and explain the trade-off without reading a script."
        if is_gate
        else f"This is step {order} of {count}. Keep all earlier behavior green while you focus on **{title.lower()}**."
    )
    return f"""---
id: {lesson_id}
title: "{title}"
release: {release_id}
order: {order}
prerequisites: {prerequisite}
outcomes:
  - Apply {title.lower()} to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: {evidence}
---

<LessonMission
  role="{profile.role}"
  problem="{profile.problem}"
  destination="{profile.destination}"
/>

# {title}

{progression}

## See the idea first

{profile.example}

Before naming the implementation pattern, identify the value that must stay true:
**{profile.invariant}.** The technical topic in this lesson exists to protect or
expose that product rule; it is not an isolated framework exercise.

{component_for(release_id)}

## Build the behavior

Work at **{profile.seam}**. Write or select one check that fails for the missing
behavior. Read the failure and confirm that it describes the store problem—not an
import typo or a broken fixture. Make the smallest production change that passes
that case, then refactor while the check remains green.

Do not delete an earlier invariant to make this lesson easier. If the new behavior
forces a design choice, record the context, decision, and consequence in an ADR.

## Walk through the change

Trace one typical value from the public input to the observable result. At each
boundary, state its shape, who validates it, and how failure appears. For this
release, the public seam is {profile.seam}; helpers are implementation details and
should not be the only thing the test observes.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

{profile.practice.capitalize()}. Keep the change in the same product story and
run the narrow check first, followed by the release verification command.

## Worked answer

A defensible answer names the invariant—{profile.invariant}—and points to the
public result that proves it. It also states what this lesson does **not** prove.
For example, a unit check cannot prove PostgreSQL locking, and a successful model
response cannot prove retrieval quality without source evidence.

## Check

```bash
{profile.command}
```

Read the command’s exit status and one meaningful value in its output. A green
command is necessary evidence, but you must still be able to explain why it
protects this store behavior.

<EvidenceCard
  command="{profile.command}"
  artifact="{profile.artifact}"
  invariant="{profile.invariant}"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="{profile.artifact}"
  interview-question="{profile.interview}"
/>
"""


def release_index(
    release_id: str, title: str, promise: str, titles: list[str], files: list[str]
) -> str:
    profile = PROFILES[release_id]
    lesson_links = "\n".join(
        f"{index}. [{lesson}]({filename.removesuffix('.md')})"
        for index, (lesson, filename) in enumerate(zip(titles, files), start=1)
    )
    return f"""---
title: "{release_id.upper()} — {title}"
description: "{promise}"
---

# {release_id.upper()} — {title}

**What you'll have:** {promise}

<LessonMission
  role="{profile.role}"
  problem="{profile.problem}"
  destination="{profile.destination}"
/>

## Lessons

{lesson_links}

## Release evidence

```bash
{profile.command}
```
"""


def main() -> None:
    force = "--force" in sys.argv
    RELEASES_ROOT.mkdir(parents=True, exist_ok=True)
    for release_id, title, promise, titles in parse_course():
        directory = RELEASES_ROOT / release_id
        directory.mkdir(parents=True, exist_ok=True)
        filenames = [
            f"{index:02d}-{slugify(lesson_title)}.md"
            for index, lesson_title in enumerate(titles, start=1)
        ]
        targets = [directory / filename for filename in filenames]
        targets.append(directory / "index.md")
        if not force and any(target.exists() for target in targets):
            raise RuntimeError(
                f"{release_id} already contains generated content; use --force intentionally"
            )
        for index, (lesson_title, filename) in enumerate(
            zip(titles, filenames), start=1
        ):
            (directory / filename).write_text(
                lesson_page(
                    release_id,
                    lesson_title,
                    index,
                    len(titles),
                )
            )
        (directory / "index.md").write_text(
            release_index(release_id, title, promise, titles, filenames)
        )
    print("Generated release indexes and lesson briefs.")


if __name__ == "__main__":
    main()
