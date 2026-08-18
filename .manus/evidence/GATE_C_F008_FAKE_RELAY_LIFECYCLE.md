# Gate C — F-008 Fake Relay Identity and Expiry Lifecycle

**Candidate base:** `12c1c29d82e8569657ee0f01f4d44640384ec562`
**Scope:** Bind fake-relay bundle identity to the approval nonce, enforce the earliest transaction expiry, and persist expiry as a terminal state.
**Execution authority:** None. This is a local deterministic relay model; it neither contacts Jito nor submits a bundle.

## Changed lifecycle controls

| Concern | Hardened behavior |
|---|---|
| Bundle identity | SHA-256 input now includes the approval nonce and all three exact message hashes. Identical messages with distinct approvals cannot share a bundle ID. |
| Expiry | The receipt expiry is the minimum expiry slot across the canonical three transactions. |
| Expiry status | A pending receipt observed at or after expiry is persisted as `Invalid` in both nonce and bundle indexes. |
| Status transitions | Only `Landed`, `Failed`, and `Invalid` can be set explicitly. Terminal receipts cannot be overwritten. |
| Unknown status | Unknown bundle IDs remain `Unknown` without creating stored state. |

## Deterministic regression coverage

| Test | Result |
|---|---|
| Same message hashes, different nonces | Produces distinct bundle IDs. |
| Duplicate approval nonce | Rejects resubmission. |
| Earliest TX expiry | Becomes receipt expiry; expiry invalidation persists and blocks later `Landed` transition. |
| Expired new bundle | Rejects submission. |
| Terminal and unknown status handling | Retained and passes. |

The TypeScript build and composer suite passed: 6 test files and 45 tests.

## Retained boundary

This fake relay is not a Jito adapter and does not prove endpoint, bundle-status, DontFront, tip-account, or landing behavior. Those remain separate read-only qualification and source-lock gates.
