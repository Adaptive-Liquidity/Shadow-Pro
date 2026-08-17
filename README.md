# Shadow Account Protocol

A **non-production security baseline** for a Solana flash-loan paymaster architecture. The repository enforces deterministic admission rules and starts with execution disabled. It contains no deployment key, remote signer credential, relay endpoint, funded vault, or live transaction path.

## Repository layout

| Path | Purpose |
|---|---|
| `programs/shadow_paymaster` | Anchor settlement state machine with fixed vault/mint/destinations, nonce-bound record, pause state, and checked 15/85 profit split. |
| `composer` | Deterministic TypeScript manifest, topology, source-lock, simulation, fee, profit, and exact-message-signature checks. |
| `config/sources.lock.json` | Evidence gate. Its current blocked entries make executable admission impossible. |
| `docs/BUILD_STATUS.md` | Implemented controls, test evidence, and hard execution blockers. |
| `docs/MODEL_ROUTING.md` | Qualified-model policy and current Hugging Face inference-capability block. |
| `docs/EXECUTION_GATES_STATUS.md` | Gate-by-gate implementation progress, validation status, and deliberate blockers. |
| `docs/GITHUB_GOVERNANCE.md` | Required branch protection and repository-security settings after a remote is attached. |
| `docs/REMOTE_SIGNER_QUALIFICATION.md` | Provider-neutral exact-message Ed25519 qualification protocol. |
| `docs/THREAT_MODEL.md` | Threat model, trust boundaries, and assurance requirements. |
| `evidence/` | Draft Jupiter and Jito evidence records that do not authorize execution. |
| `audit/` | External audit package index and model-assisted review protocol. |

## Local-only validation

```bash
source "$HOME/.cargo/env"
cd /home/ubuntu/shadow-account-protocol
cargo fmt --check
cargo test -p shadow_paymaster
cargo check -p shadow_paymaster

cd composer
pnpm build
pnpm test
```

## Security boundaries

The on-chain program uses only fixed configuration-owned mint, vault, paymaster destination, and treasury destination accounts. It computes distribution from recorded balance deltas and obligations, not caller-supplied profit or payout values. The off-chain gate rejects any noncanonical transaction sequence, route or flash-loan instruction outside TX-1, unapproved program/account/ALT, stale simulation, unsafe fee/tip exposure, reused nonce, destination substitution, wrong signer, or invalid exact-message receipt. The local-only harness also rejects a funded agent and insufficient paymaster fee coverage; the fake relay rejects duplicates, expiry retry, terminal-state mutation, and unknown-status escalation.

> **Do not deploy, fund, sign, connect a remote signer, send a transaction, or submit a bundle from this repository.** The source lock intentionally blocks Jupiter Flashloan and Jito relay activation pending immutable interface evidence and local fixtures.

## Current build constraints

The local compiler stack is installed and the program/tests build. The external Jupiter Flashloan IDL and Jito submission endpoint remain source-lock blocked. The current Hugging Face integration does not expose coding-model inference, so no model is qualified or used to generate code through that connector.
