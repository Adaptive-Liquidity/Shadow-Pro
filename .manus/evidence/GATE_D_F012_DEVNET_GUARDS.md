# Gate D F-012: Devnet Readiness Guard Hardening

**Candidate base:** `b7f6200985deba017f818367e589f3ed43c87855`  
**Scope:** Static deny-by-default configuration validation only.  
**Applied workflow:** `shadow-account-protocol`  
**Execution boundary:** No deployment, funding, key creation, signer connection, RPC submission, Jito submission, or Jupiter execution is enabled or invoked.

## Remediation

The devnet readiness guard previously accepted a missing required-unset field because it iterated only keys that happened to be present. It also validated `Anchor.toml` with substring matching, allowing comments or unrelated text to satisfy a local-only check.

The guard now requires every declared test-only identifier and endpoint field to exist and be `null`, rejects unexpected non-null unset values, and calls a structured TOML validator. The validator requires the parsed `[provider]` table to contain `cluster = "Localnet"` and a wallet reference containing `LOCAL_ONLY_DO_NOT_FUND`.

## Deterministic Validation

| Case | Result |
|---|---|
| Canonical template and Anchor configuration | Passed. |
| Omitted `required_unset_values.agent_public_key` | Rejected with the exact missing-field error. |
| Parsed `Anchor.toml` changed to `cluster = "Devnet"` | Rejected through the structured local-only validator. |
| Source lock and program identity | Remained valid and fail closed. |
| Local memory | Recorded as memory fact `id: 2`; SQLite remains local/ignored. |

## Retained Boundary

This is a preflight safeguard, not authorization for any devnet action. The test-only deployment, test-payer funding, transaction submission, signer connection, and Jito testnet submission approval gates remain explicit and unset.
