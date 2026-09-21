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
    title: 'Core Python',
    promise: 'Values, collections, control flow, and functions, practiced on the Gold Pasal tray.',
    capability: 'foundation',
    prerequisites: [],
    lessons: lessons('r0', [
      'Set up the workshop',
      'Run Python in gold-pasal',
      'Numbers, strings, and Decimal',
      'Lists, tuples, dicts, and sets',
      'Conditionals and loops',
      'Functions',
      'Release gate: counter script',
    ], ['commit']),
  },
  {
    id: 'r1',
    title: 'Intermediate and advanced Python',
    promise: 'Packages, exceptions, classes, types, generators, and pytest, ending in the gold-pasal quote CLI.',
    capability: 'foundation',
    prerequisites: ['r0'],
    lessons: lessons('r1', [
      'Modules, packages, and imports',
      'Exceptions and error handling',
      'Classes, dataclasses, and enums',
      'Type hints, Protocols, and pyright',
      'Generators, files, and decorators',
      'Test with pytest',
      'Release gate: the quote CLI',
    ]),
  },
  {
    id: 'r2',
    title: 'Design a trustworthy domain core',
    promise: 'Value objects, property tests, Protocols, fakes, and logging around one pricing seam.',
    capability: 'backend',
    prerequisites: ['r1'],
    lessons: lessons('r2', [
      'Value objects: Money, Weight, Purity',
      'Refactor pricing with a safety net',
      'Organize tests: conftest and markers',
      'Property-based tests with Hypothesis',
      'Protocols and the strategy pattern',
      'Repositories and test doubles',
      'Logging and auditable decisions',
      'Release gate: pricing invariants',
    ]),
  },
  {
    id: 'r3',
    title: 'HTTP APIs with FastAPI',
    promise: 'A documented catalog API with validated bodies, problem details, and in-process tests.',
    capability: 'backend',
    prerequisites: ['r2'],
    lessons: lessons('r3', [
      'HTTP and the first FastAPI app',
      'Pydantic models and request bodies',
      'Path and query parameters',
      'Errors and problem details',
      'Dependency injection and routers',
      'Test the API with HTTPX',
      'Release gate: catalog from curl',
    ]),
  },
  {
    id: 'r4',
    title: 'PostgreSQL, SQLAlchemy, and transactions',
    promise: 'A migrated PostgreSQL schema behind the repository ports, and a hold race that only one customer wins.',
    capability: 'backend',
    prerequisites: ['r3'],
    lessons: lessons('r4', [
      'Run PostgreSQL with Docker Compose',
      'SQL essentials on the tray',
      'SQLAlchemy 2: engine, sessions, and mapped classes',
      'Alembic migrations',
      'A PostgreSQL catalog adapter',
      'Stock items and holds in a transaction',
      'The double-hold race and unique constraints',
      'Integration tests on a real database',
      'Release gate: one hold wins',
    ]),
  },
  {
    id: 'r5',
    title: 'Orders, identity, and secrets',
    promise: 'Replay-safe checkout behind bearer tokens and roles, with settings from the environment and an audit trail.',
    capability: 'backend',
    prerequisites: ['r4'],
    lessons: lessons('r5', [
      'Settings and secrets with pydantic-settings',
      'Authenticate with bearer tokens',
      'Authorize by role',
      'Model the order state machine',
      'Turn a hold into an order',
      'Idempotency keys',
      'Payment behind a port',
      'Audit events',
      'Release gate: replay-safe checkout',
    ]),
  },
  {
    id: 'r6',
    title: 'Team workflow and production confidence',
    promise: 'Branches, pull requests, CI against PostgreSQL, request ids, /ready, and logs you can grep.',
    capability: 'backend',
    prerequisites: ['r5'],
    lessons: lessons('r6', [
      'Work on a branch',
      'Open a pull request',
      'Rebase and resolve conflicts',
      'Run integration tests in CI',
      'Echo X-Request-ID',
      'Add /ready and safe 404s',
      'Structured JSON logs',
      'Layered tests and EXPLAIN',
      'Release gate: incident from logs',
    ]),
  },
  {
    id: 'r7',
    title: 'Containerized Gold Pasal',
    promise: 'A small, non-root image and a Compose stack that starts the same way on a clean machine.',
    capability: 'operations',
    prerequisites: ['r6'],
    lessons: lessons('r7', [
      'Image, container, process, port, volume',
      'Multi-stage image as non-root',
      'Configure with environment variables',
      'Compose API and PostgreSQL',
      'Startup, liveness, and readiness',
      'Persist and restore database data',
      'Release gate: clean-machine stack',
    ]),
  },
  {
    id: 'r8',
    title: 'Kubernetes on kind',
    promise: 'A local kind cluster runs the API with Deployment, Service, Ingress, probes, and a tested rollback.',
    capability: 'operations',
    prerequisites: ['r7'],
    lessons: lessons('r8', [
      'kind cluster and Kubernetes objects',
      'Deployment and Service',
      'Ingress on kind',
      'ConfigMaps and Secrets',
      'Probes, requests, and limits',
      'Roll out and roll back',
      'Debug Pending and CrashLoop',
      'Release gate: kind rollout drill',
    ], ['deployment', 'runbook']),
  },
  {
    id: 'r9',
    title: 'Delivery',
    promise: 'CI builds one image to GHCR, scans it, deploys by digest, and rolls back by digest.',
    capability: 'operations',
    prerequisites: ['r8'],
    lessons: lessons('r9', [
      'Test matrix in GitHub Actions',
      'Build once to GHCR',
      'Scans and provenance',
      'Deploy by manifest change',
      'Smoke after deploy',
      'Roll back by digest',
      'Release gate: commit to running image',
    ], ['pull-request', 'ci-run', 'deployment']),
  },
  {
    id: 'r10',
    title: 'Local AI shopping assistant',
    promise: 'An evaluated assistant on Ollama by default, with async I/O and an OpenAI adapter tested from fixtures.',
    capability: 'ai',
    prerequisites: ['r9'],
    lessons: lessons('r10', [
      'Deterministic vs probabilistic',
      'Ollama behind a Protocol',
      'Async Python for model calls',
      'OpenAI adapter with fixtures',
      'Structured output',
      'Version prompts like code',
      'Retrieve catalog facts first',
      'Golden evals and metrics',
      'Timeouts, retries, and fallback',
      'Prompt injection defenses',
      'Release gate: honest assistant',
    ], ['evaluation', 'ci-run']),
  },
  {
    id: 'r11',
    title: 'Bounded staff agent',
    promise: 'A traced agent with typed tools, approvals, and stop conditions enforced in code.',
    capability: 'ai',
    prerequisites: ['r10'],
    lessons: lessons('r11', [
      'Workflow or agent',
      'Typed tools via the API',
      'Budgets and allowlists',
      'Confirm before inventory writes',
      'Persist run state',
      'Trace without leaking secrets',
      'Golden trajectories',
      'Red-team the agent',
      'Release gate: stop conditions',
    ], ['evaluation', 'demo']),
  },
  {
    id: 'r12',
    title: 'Gold Pasal over MCP',
    promise: 'A least-privilege stdio MCP server backed by the existing application API.',
    capability: 'ai',
    prerequisites: ['r11'],
    lessons: lessons('r12', [
      'JSON-RPC and MCP',
      'Start and stop a stdio server',
      'Typed tools and catalog search',
      'Resources and prompts',
      'Validate tool arguments',
      'Idempotent hold with confirmation',
      'Protocol errors and least privilege',
      'Inspector and contract tests',
      'Release gate: safe MCP failure',
    ], ['ci-run', 'demo']),
  },
  {
    id: 'r13',
    title: 'Forward-deployed integration',
    promise: 'A customer CSV plus a quirky HTTP API, an adapter, HTMX demo, runbook, and a recorded stakeholder walkthrough.',
    capability: 'ai',
    prerequisites: ['r12'],
    lessons: lessons('r13', [
      'Meet the customer system',
      'Write the discovery note',
      'Build the customer adapter',
      'Point assistant and MCP at it',
      'Serve an HTMX demo',
      'Write the runbook',
      'Record the stakeholder demo',
      'Release gate: customer integration',
    ], ['runbook', 'demo']),
  },
  {
    id: 'r14',
    title: 'Portfolio and interview',
    promise: 'A short system story backed by ADRs, demos, and evidence a reviewer can open.',
    capability: 'portfolio',
    prerequisites: ['r13'],
    lessons: lessons('r14', [
      'Close accidental complexity',
      'Curate ADRs and runbooks',
      'Rehearse the system-design walkthrough',
      'Honest resume bullets',
      'Final incident and safety drill',
      'Release gate: publish the portfolio',
    ], ['adr', 'deployment', 'demo']),
  },
]

export const allLessons = releases.flatMap((release) => release.lessons)

export function findRelease(id: string): ReleaseDefinition | undefined {
  return releases.find((release) => release.id === id)
}
