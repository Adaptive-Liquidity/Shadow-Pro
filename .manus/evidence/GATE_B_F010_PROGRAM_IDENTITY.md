# Gate B — F-010 Local-Only Program Identity Reconciliation

**Candidate base:** `51ab666fb2fb3d20af3ffa0c9fd03b6ce0b43e0b`
**Scope:** Reconcile the compiled `declare_id!`, Anchor localnet mapping, and local-only source-lock identifier.
**Execution authority:** None. No keypair was generated, no program was deployed, no IDL was pinned, and no source-lock entry was enabled.

## Finding

The compiled declaration used `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`, while `Anchor.toml` and `config/sources.lock.json` used an unapproved placeholder. This made repository identity evidence internally inconsistent.

## Remediation

| Surface | New value | Deployment meaning |
|---|---|---|
| `declare_id!` | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` | Existing compiled local-only declaration; no deployment claim. |
| `Anchor.toml` localnet mapping | Same declaration value | Local configuration consistency only. |
| `sources.lock.json` local-only program entry | Same declaration value | Still `local-only`, `idl_sha256: null`, and blocked from deployment. |
| `scripts/check_program_identity.mjs` | Deterministic equality guard | Rejects configuration/lock/declaration mismatch and rejects any local-only status or IDL-pin violation. |

## Validation

| Check | Result |
|---|---|
| Identity guard on candidate | Passed; reported consistent identity and `execution_enabled: false`. |
| Existing source-lock guard | Passed; execution remains fail-closed. |
| Isolated adversarial guard test | Passed; a temporary Anchor configuration with a different program ID was rejected with `Anchor.toml program ID must equal declare_id!`. |

## Non-bypassable follow-up

This reconciliation does not select a deployable program identity. Before any deployment discussion, an owner-approved test-only program-ID lifecycle must generate or select a real test identity, build the exact artifact, generate and hash its IDL, update the source lock with reviewed evidence, and receive a separate state-changing approval. This file does not satisfy any of those conditions.
