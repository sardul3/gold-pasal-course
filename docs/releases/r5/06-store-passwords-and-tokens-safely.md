---
id: r5-06
title: "Store passwords and tokens safely"
release: r5
order: 6
prerequisites: [r5-05]
outcomes:
  - Apply store passwords and tokens safely to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

# Store passwords and tokens safely


This is step 6 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

If a database backup leaks, plaintext passwords turn one incident into account takeover across every site where a customer reused a password. Reversible encryption still leaves a key that can reveal all passwords.

<TestMatrix unit="retries do not duplicate effects and principals cannot cross ownership boundaries" slice="the authenticated order API" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="Two POST requests with idempotency key checkout-731 return the same order identifier and charge the payment stub once." />

## Build the mental model

Passwords are verified, not recovered. Store a slow, salted password hash produced by a maintained password-hashing library such as Argon2id or bcrypt with reviewed parameters. The encoded value includes algorithm, cost, salt, and hash. A unique random salt defeats precomputed tables; slowness raises attacker cost. Rehash after successful login when parameters become outdated.

Bearer tokens are different. A self-contained signed token may be verified with a key and short expiry; a random opaque session token should be stored as a hash so database readers cannot replay it. Never log either token. Support expiry, revocation/session invalidation, and key rotation.

## Check it by hand

Sita and Maya both choose the teaching password `Tilhari!731`. Their stored hashes must differ because salts differ, yet verification succeeds for each. An opaque token `gp_live_example_731` is shown once; the database stores only its digest and metadata such as subject and expiry.

## Start with a failing test

Write failing tests that two equal passwords produce different encoded hashes, correct verification succeeds, wrong verification fails, and plaintext never appears in the stored user row. Add token tests for valid, expired, revoked, and unknown tokens. Avoid asserting an exact hash string because random salts are expected.

## Trace the non-trivial flow

Registration validates policy, hashes the password, and discards plaintext. Login loads the encoded hash, performs constant-library verification, and returns a generic failure for unknown user or wrong password. Token issuance generates strong randomness, stores only a digest when opaque, and returns the token once over TLS. Authentication hashes the presented token and compares safely.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, state change, call count, and audit effect before running the check. If the output differs, find the first trust or transaction boundary where your model diverged.

</PredictThenRun>

## Practice

Inspect a hash’s algorithm and cost fields without copying a real credential into notes. Advance a fake clock to token expiry and predict authentication. Explain why SHA-256(password) is fast and therefore unsuitable even with a salt.

## Worked reasoning

Equal passwords should yield different hashes while both verify. Plaintext and bearer values must be absent from storage and logs. Hashing limits damage; it does not replace TLS, rate limiting, MFA decisions, or secure recovery.

## Check

```bash
uv run pytest tests/http/orders tests/security -q
```

Run the narrow test you wrote first, then this release check. Read the exit status and one meaningful order ID, denial type, or side-effect count. Green output without an explanation is incomplete evidence.

<EvidenceCard
  command="uv run pytest tests/http/orders tests/security -q"
  artifact="authorization tests, an audit sample, and an idempotency demonstration"
  invariant="retries do not duplicate effects and principals cannot cross ownership boundaries"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="authorization tests, an audit sample, and an idempotency demonstration"
  interview-question="How do authentication, authorization, ownership, and audit differ?"
/>
