# Owner External-Review Signoff

**Owner and final reviewer:** `@Adaptive-Liquidity`
**Policy version:** `1.0`
**Purpose:** Record the accountable owner’s review of one immutable candidate and any external model or platform review used as supporting evidence.

> This signoff authorizes only the bounded repository or operational decision identified below. It never bypasses deterministic technical checks, account constraints, source locks, signature verification, zero-agent-SOL enforcement, time/slot expiry, unavailable external dependencies, or any separately required deployment/funding/submission approval.

## Candidate identity

| Field | Required value |
|---|---|
| Pull request | `#<number>` |
| Branch | `<branch>` |
| Immutable Git commit | `<40-character SHA>` |
| Program artifact SHA-256, if applicable | `<64-character SHA-256>` or `N/A` |
| IDL SHA-256, if applicable | `<64-character SHA-256>` or `N/A` |
| Composer/config/source-lock SHA-256, if applicable | `<64-character SHA-256>` or `N/A` |
| Required CI run URL and conclusion | `<URL and success/failure>` |
| Review timestamp (UTC RFC3339) | `<timestamp>` |

## Review scope

| Field | Required value |
|---|---|
| Change scope | `<precise files, findings, and intended decision>` |
| Invariants examined | `<zero-agent-SOL, fixed vaults, source locks, etc.>` |
| Deterministic tests reviewed | `<commands, outputs, and evidence paths>` |
| Known residual risks | `<explicit risks that remain>` |
| Explicit non-goals | `<deployment/funding/signing/Jito/Jupiter/etc. as applicable>` |

## Supporting external review evidence

External models and platforms are advisory inputs only. They do not approve code, satisfy a technical invariant, sign transactions, alter source locks, or create deployment authority.

| Reviewer or platform | Role | Immutable candidate SHA reviewed | Evidence URL/path or sanitized digest | Findings accepted | Findings rejected and rationale |
|---|---|---|---|---|---|
| `<name>` | `<review role>` | `<SHA>` | `<evidence>` | `<IDs>` | `<IDs and rationale>` |

## Owner decision

| Field | Required value |
|---|---|
| Accepted findings | `<IDs and remediation commitments>` |
| Rejected findings | `<IDs and precise rationale>` |
| Gate decision | `pass` / `blocked` / `remediate` |
| Authorized next action | `<one bounded action>` |
| Prohibited actions retained | `<all actions still blocked>` |

### Attributable owner approval

```text
I, @Adaptive-Liquidity, reviewed the immutable candidate and supporting evidence above.

Decision: <pass | blocked | remediate>
Authorized next action: <one bounded action>
Date (UTC): <RFC3339 timestamp>
GitHub approval/review URL or commit-signature evidence: <URL>
```

## Mandatory enforcement rule

A completed owner signoff is **not** a waiver. If any required test fails, evidence hash differs, source lock is blocked, account constraint is absent, agent balance is nonzero, signature is invalid, manifest is stale, or an external integration is unavailable, the candidate remains blocked regardless of owner approval.
