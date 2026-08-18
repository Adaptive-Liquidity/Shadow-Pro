# Gate C — F-002 Source-Lock Authority and Schema Remediation

**Candidate base:** `d92f83b4d05fe1af484baf4f38718c39c2ef2ee2`
**Scope:** Replace caller-declared execution permission with a validated source-lock object and fail closed on ambiguous dependency evidence.
**Execution authority:** None. The repository lock remains local-only/blocked and both runtime and CI reject enabled execution.

## Changed authority model

`GatePolicy.sourceLockAllowsExecution: boolean` was removed. `GatePolicy` now receives the source-lock object and an explicit required-entry list. `validateManifest` derives admission only through `sourceLockAllowsExecution(policy.sourceLock, policy.requiredSourceLockEntries)`.

A caller can no longer set a Boolean to bypass a blocked dependency. A missing, duplicate, malformed, unknown-kind, unpinned, or incomplete entry denies admission.

## Schema guarantees

| Property | Runtime evaluator | Repository CI guard |
|---|---|---|
| Nonempty entry names | Required | Required |
| Unique entry names | Required | Required |
| Supported kinds | `anchor-program`, `external-program`, `relay` only | Same allowlist |
| Supported statuses | `local-only`, `pinned`, `blocked` only | Same allowlist |
| Implementation-gate text | Required | Required |
| Pinned program integrity | Program ID and immutable IDL hash required for anchor/external programs | Same requirement |
| Pinned relay integrity | Endpoint required | Same requirement |
| Required dependency presence | Required by policy | Runtime admission check |

## Deterministic regression coverage

| Test | Result |
|---|---|
| Canonical fully pinned fixture admits | Passes. |
| Blocked Jupiter entry denies manifest admission | Passes with `SOURCE_LOCK_BLOCKED`; no caller Boolean exists. |
| Repository current lock remains blocked | Passes. |
| Unknown kind denies | Passes. |
| Duplicate entry name denies | Passes. |
| Missing required entry denies | Passes. |
| Pinned program without immutable IDL hash denies | Passes. |
| Repository CI source-lock guard | Passes and reports execution fail-closed. |

The TypeScript build and full composer suite passed: 6 test files and 37 tests. The repository `check_source_lock.mjs` guard also passed against the actual blocked source lock.

## Retained safety boundary

A test fixture may represent a fully pinned dependency set to test deterministic admission logic. It does not alter `config/sources.lock.json`, enable a source lock, contact a provider, construct a transaction, request a signature, or submit anything.
