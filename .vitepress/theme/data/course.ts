export type EvidenceKind =
  | 'commit'
  | 'pull-request'
  | 'ci-run'
  | 'adr'
  | 'runbook'
  | 'deployment'
  | 'evaluation'
  | 'demo'

export interface LessonDefinition {
  id: string
  title: string
  order: number
  prerequisites: string[]
  evidence: EvidenceKind[]
}

export interface ReleaseDefinition {
  id: `r${number}`
  title: string
  promise: string
  capability: 'foundation' | 'backend' | 'operations' | 'ai' | 'portfolio'
  prerequisites: string[]
  lessons: LessonDefinition[]
}

function lessons(
  release: ReleaseDefinition['id'],
  titles: string[],
  evidence: EvidenceKind[] = ['commit', 'ci-run'],
): LessonDefinition[] {
  return titles.map((title, index) => ({
    id: `${release}-${String(index + 1).padStart(2, '0')}`,
    title,
    order: index + 1,
    prerequisites: index === 0 ? [] : [`${release}-${String(index).padStart(2, '0')}`],
    evidence: title.startsWith('Release gate:') ? [...evidence, 'demo'] : evidence,
  }))
}

export const releases: ReleaseDefinition[] = [
  {
    id: 'r0',
    title: 'Your Python workshop',
    promise: 'A reproducible Python workspace and a first green quality check.',
    capability: 'foundation',
    prerequisites: [],
    lessons: lessons('r0', [
      'Welcome to Gold Pasal',
      'Java to Python',
      'Prepare the workshop',
      'The first program',
      'Read a traceback',
      'Small commits',
      'Release gate: first CI check',
    ]),
  },
  {
    id: 'r1',
    title: 'The gold-rate quote desk',
    promise: 'A typed CLI that explains a Nepal jewelry quote in NPR.',
    capability: 'foundation',
    prerequisites: ['r0'],
    lessons: lessons('r1', [
      'Model a customer quote with Python values and names',
      'Choose strings, integers, booleans, and Decimal for jewelry data',
      'Convert grams and tola without hiding rounding rules',
      'Represent karat choices with conditionals and enums',
      'Price several products with lists, tuples, sets, and dictionaries',
      'Extract pricing rules into small functions',
      'Validate bad weights, rates, and karat values with exceptions',
      'Split the quote desk into modules and packages',
      'Add type hints and let Pyright find a real defect',
      'Use dataclasses for quote inputs and results',
      'Build a useful pricing CLI',
      'Release gate: explain and reproduce an NPR quote by hand and in code',
    ]),
  },
  {
    id: 'r2',
    title: 'A trustworthy domain core',
    promise: 'Pricing rules protected by tests, value objects, and explicit ports.',
    capability: 'backend',
    prerequisites: ['r1'],
    lessons: lessons('r2', [
      'Turn a pricing bug into the first failing pytest',
      'Arrange fixtures around real Nepal jewelry examples',
      'Cover karat, wastage, making charges, VAT, and rounding with parametrization',
      'Separate Money, Weight, Purity, and Quote as value objects',
      'Refactor toward clear names, small functions, and explicit invariants',
      'Use Strategy for replaceable making-charge rules',
      'Use Protocol and dependency inversion instead of framework coupling',
      'Introduce Repository without building a database too early',
      'Test boundaries with fakes, stubs, and mocks for the right reasons',
      'Add property tests for pricing invariants',
      'Record auditable pricing decisions',
      'Release gate: defend the domain model and testing choices',
    ]),
  },
  {
    id: 'r3',
    title: 'API-first catalog',
    promise: 'A documented FastAPI catalog contract with stable errors and tests.',
    capability: 'backend',
    prerequisites: ['r2'],
    lessons: lessons('r3', [
      'Follow an HTTP request from client to response',
      'Design the catalog contract in OpenAPI before FastAPI code',
      'Create the FastAPI application and health endpoint',
      'Validate request and response data with Pydantic v2',
      'Add products with SKU, metal, purity, weight, and price inputs',
      'Retrieve and list products with filtering, sorting, and pagination',
      'Return consistent Problem Details for expected failures',
      'Separate HTTP schemas from domain objects',
      'Inject repositories and services through explicit dependencies',
      'Test routes in-process with HTTPX',
      'Detect accidental API changes with contract checks',
      'Release gate: demo the API from docs, curl, and tests',
    ]),
  },
  {
    id: 'r4',
    title: 'Persistent inventory and safe reservations',
    promise: 'Transactional PostgreSQL inventory that resists double reservation.',
    capability: 'backend',
    prerequisites: ['r3'],
    lessons: lessons('r4', [
      'Learn relational modeling from products, stock, and holds',
      'Run PostgreSQL locally and connect with SQLAlchemy 2',
      'Map records without leaking ORM concerns into the domain',
      'Version the schema with Alembic migrations',
      'Seed believable catalog and inventory data',
      'Create an inventory hold inside a transaction',
      'Reproduce and fix the double-reservation race',
      'Expire holds safely and make time testable',
      'Test real PostgreSQL behavior with Testcontainers',
      'Plan backup, restore, and migration rollback',
      'Release gate: prove inventory consistency under concurrency',
    ]),
  },
  {
    id: 'r5',
    title: 'Orders and secure staff operations',
    promise: 'Replay-safe orders, role boundaries, and auditable staff actions.',
    capability: 'backend',
    prerequisites: ['r4'],
    lessons: lessons('r5', [
      'Move from hold to order with an explicit state machine',
      'Make order creation idempotent',
      'Stub payment behind a port without pretending PCI is solved',
      'Authenticate customers and staff',
      'Authorize catalog, inventory, and order actions by role',
      'Store passwords and tokens safely',
      'Keep secrets out of Git and logs',
      'Build an append-only audit trail for sensitive changes',
      'Threat-model Gold Pasal with concrete abuse cases',
      'Test authentication, authorization, and ownership boundaries',
      'Release gate: demonstrate replay-safe and least-privilege operations',
    ]),
  },
  {
    id: 'r6',
    title: 'Production confidence',
    promise: 'Observable behavior, layered tests, and evidence-led incident diagnosis.',
    capability: 'backend',
    prerequisites: ['r5'],
    lessons: lessons('r6', [
      'Revisit the testing pyramid using the complete order path',
      'Write focused unit, HTTP-slice, integration, and contract suites',
      'Use test doubles without testing implementation details',
      'Make tests deterministic across clock, randomness, and network',
      'Use coverage to find risk, not chase a percentage',
      'Enforce formatting, linting, typing, and import boundaries',
      'Measure and improve a slow catalog query',
      'Add structured logs, request IDs, metrics, and traces',
      'Diagnose a failing order from evidence instead of guesses',
      'Define SLOs and actionable alerts for a small service',
      'Release gate: run an incident drill and produce a short postmortem',
    ]),
  },
  {
    id: 'r7',
    title: 'Containerized Gold Pasal',
    promise: 'A small, non-root image and reproducible local production stack.',
    capability: 'operations',
    prerequisites: ['r6'],
    lessons: lessons('r7', [
      'Understand image, container, process, port, and volume through the API',
      'Build a small multi-stage Python image',
      'Run as non-root with a read-only-friendly filesystem',
      'Configure the app through environment variables',
      'Compose API and PostgreSQL for local production simulation',
      'Distinguish startup, liveness, and readiness checks',
      'Persist and restore database data',
      'Scan the image and generate an SBOM',
      'Release gate: rebuild and run the stack on a clean machine',
    ]),
  },
  {
    id: 'r8',
    title: 'Gold Pasal on homelab Kubernetes',
    promise: 'A constrained, observable workload with a tested rollback path.',
    capability: 'operations',
    prerequisites: ['r7'],
    lessons: lessons('r8', [
      'Read Kubernetes objects as desired-state documents',
      'Deploy immutable API images with Deployment and Service',
      'Route traffic through the homelab Ingress',
      'Manage configuration and secrets without committing credentials',
      'Configure probes, requests, limits, and graceful shutdown',
      'Package environments with Kustomize',
      'Roll out, observe, and roll back a release',
      'Diagnose Pending, CrashLoopBackOff, and unavailable Service scenarios',
      'Handle migrations and dependent services safely',
      'Add network and workload security controls appropriate to the homelab',
      'Release gate: perform a witnessed rollout and recovery drill',
    ], ['deployment', 'runbook']),
  },
  {
    id: 'r9',
    title: 'CI/CD and GitOps delivery',
    promise: 'A traceable path from reviewed change to immutable homelab release.',
    capability: 'operations',
    prerequisites: ['r8'],
    lessons: lessons('r9', [
      'Turn the local quality command into GitHub Actions jobs',
      'Cache dependencies without hiding reproducibility problems',
      'Run unit, integration, contract, migration, and container smoke gates',
      'Build once and publish an immutable image to GHCR',
      'Add dependency, secret, image, and provenance checks',
      'Promote by reviewed manifest change, not an imperative cluster command',
      'Let Argo CD pull the approved homelab state',
      'Run post-deployment smoke checks and surface failure clearly',
      'Roll back by Git history and verified image digest',
      'Build and deploy the VitePress course independently to GitHub Pages',
      'Release gate: trace one commit from PR to running homelab release',
    ], ['pull-request', 'ci-run', 'deployment']),
  },
  {
    id: 'r10',
    title: 'Local AI shopping assistant',
    promise: 'An evaluated Ollama-backed assistant that cites facts and fails honestly.',
    capability: 'ai',
    prerequisites: ['r9'],
    lessons: lessons('r10', [
      'Separate deterministic product logic from probabilistic model behavior',
      'Run Ollama and hide provider details behind an adapter',
      'Ask for structured output and reject invalid responses',
      'Version prompts like code and record model configuration',
      'Retrieve catalog facts before generating an answer',
      'Compare keyword, SQLite full-text, and embedding retrieval',
      'Build a small golden evaluation set from shopper questions',
      'Measure retrieval, answer quality, latency, and failure separately',
      'Add timeouts, bounded retries, fallback, and a kill switch',
      'Defend catalog data from prompt injection and untrusted content',
      'Test AI behavior without paid network calls in CI',
      'Release gate: show an evaluated assistant that admits uncertainty',
    ], ['evaluation', 'ci-run']),
  },
  {
    id: 'r11',
    title: 'Bounded staff agent',
    promise: 'A traced agent with typed tools, approvals, and executable stop conditions.',
    capability: 'ai',
    prerequisites: ['r10'],
    lessons: lessons('r11', [
      'Decide when a workflow is enough and when an agent is justified',
      'Define typed tools for search, holds, and order status',
      'Make tools call the Gold Pasal API instead of domain duplicates',
      'Add allowlists, deadlines, step budgets, and output limits',
      'Require confirmation before inventory-changing actions',
      'Persist explicit run state outside chat history',
      'Trace observe–decide–act steps without leaking secrets',
      'Evaluate outcomes and golden tool trajectories',
      'Handle model, tool, partial-success, and retry failures',
      'Red-team unsafe requests and confused-deputy scenarios',
      'Release gate: defend the stop conditions and safety boundary',
    ], ['evaluation', 'demo']),
  },
  {
    id: 'r12',
    title: 'Gold Pasal over MCP',
    promise: 'A least-privilege MCP server backed by the existing application API.',
    capability: 'ai',
    prerequisites: ['r11'],
    lessons: lessons('r12', [
      'Understand JSON-RPC and MCP client/server responsibilities',
      'Start and stop a stdio MCP server correctly',
      'Advertise capabilities and list typed tools',
      'Expose read-only catalog search through the existing API',
      'Add order-status resources and curated prompts where they fit',
      'Validate every tool argument in the harness',
      'Add idempotent hold creation with explicit confirmation policy',
      'Return useful protocol errors without exposing internals',
      'Test with MCP Inspector and automated contract fixtures',
      'Apply roots, authorization, logging, and least privilege',
      'Release gate: connect a client and demonstrate safe failure paths',
    ], ['ci-run', 'demo']),
  },
  {
    id: 'r13',
    title: 'Job-ready portfolio release',
    promise: 'A defensible system narrative supported by working operational evidence.',
    capability: 'portfolio',
    prerequisites: ['r12'],
    lessons: lessons('r13', [
      'Review the architecture and close accidental complexity',
      'Curate ADRs, diagrams, OpenAPI, and operational runbooks',
      'Build a guided Demo Mode from the Portfolio Ledger',
      'Rehearse a backend system-design walkthrough',
      'Rehearse Python, testing, API, database, Kubernetes, and AI trade-offs',
      'Translate release evidence into honest résumé bullets',
      'Run a final incident, rollback, and agent-safety drill',
      'Release gate: publish the final release and identify the next specialization',
    ], ['adr', 'deployment', 'demo']),
  },
]

export const allLessons = releases.flatMap((release) => release.lessons)

export function findRelease(id: string): ReleaseDefinition | undefined {
  return releases.find((release) => release.id === id)
}
