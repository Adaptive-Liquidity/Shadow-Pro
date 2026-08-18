# Shadow Account Protocol — Build Status

**Build type:** Non-production, local-only security baseline.  
**Live execution:** Disabled by source lock and by policy design.  
**Capital movement:** Not implemented, funded, signed, simulated against mainnet, or submitted.

## Implemented controls

| Component | Current implementation | Safety property |
|---|---|---|
| `shadow_paymaster` Anchor program | Fixed configuration, fixed vault, fixed mint, fixed destinations, settlement PDA, pause state, state machine, checked 15/85 distribution. | Prevents caller-selected vaults, mints, destinations, payout amounts, repeated distribution, backward transitions, and arithmetic errors. |
| Deterministic composer | Canonical hashing, three-transaction topology checking, instruction classifiers, program/ALT/account-owner allowlists, fee ceilings, simulation freshness, nonce replay rejection, profit admission. | Does not accept opaque user-decoded transactions or unbounded fee/tip/destination changes. |
| Remote signer verifier | Verifies an Ed25519 signature over exact serialized message bytes and binds signer public key, message hash, and expiry. | Does not generate or hold a private key. |
| Source lock | The current Jupiter flash-loan IDL and Jito relay endpoint remain blocked. | `sourceLockAllowsExecution` is false; no route can be admitted as executable. |
| Project skills | `solana-professional`, `shadow-account-protocol`, and `shadow-execution-gate` are installed and structurally validated. | Enforces repeatable implementation gates in future tasks. |

## Tests already executed

| Scope | Result |
|---|---|
| Repository secret-pattern check | Passed; no configured credential material or private-key-like file found. |
| Source-lock check | Passed; external Jupiter and Jito dependencies remain fail-closed. |
| Composer strict TypeScript build | Passed. |
| Composer adversarial tests | **52 passed** across source-lock evaluation, immutable Jupiter Flashloan decoding, local-harness zero-agent-capital/fee boundaries, manifest admission, exact-message signer receipts, and fake-relay nonce/expiry/status handling. |
| Composer production dependency audit | Passed; no known vulnerabilities reported. |
| Anchor program formatting | Passed. |
| Anchor program unit tests | **11 passed**: program ID; configured/substitute vault checks; destination-alias checks; settlement-expiry enforcement; exact 15/85 split; strict minimum; repayment shortfall; and arithmetic boundaries. |
| Anchor program compiler check | Passed with four known Anchor macro `unexpected_cfg` warnings under Rust 1.97 / Anchor 0.32.1; no Rust compile errors. |
| Pull-request CI | Passed on merged PRs [#1](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/1), [#5](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/5), [#6](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/6), and [#8](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/8). The latest Gate D `Security Baseline CI` run `32170459932` passed, including the auditable native build and review-only SBOM artifact. |
| Project skills validation | 3 of 3 valid. |

## Execution blockers

The following are deliberate hard stops. Do not work around any of them with environment variables, mock production values, or manual transaction submission.

1. **Jupiter Flashloan remains blocked.** Pin an immutable official target/IDL revision, SHA-256, account map, and a local fixture proving exact one-transaction borrow → route → repay semantics.
2. **Jito relay remains blocked.** Pin the authenticated endpoint, status model, current tip-account retrieval, and a local or sanctioned non-production integration fixture.
3. **Remote signer remains unselected.** Run the provider golden vector against exact Solana serialized messages, enforce idempotency and request expiry, and measure p99 latency before any signer becomes eligible.
4. **No program ID, deployment key, test payer, test mint, vault, or destination is approved.** The program currently uses the Anchor local template ID; it is not a deployment authorization.
5. **Devnet readiness is preparation only.** `config/devnet-readiness.template.json`, `docs/DEVNET_PAYMASTER_READINESS.md`, and `scripts/collect_devnet_readiness_snapshot.mjs` preserve a deny-by-default project-owned paymaster test path. They do not authorize deployment, key creation, funding, signer connection, or transaction submission.
6. **No mock-program substitution is permitted.** Jupiter Flashloan is not verified as deployed on devnet/testnet; therefore a real full flashloan test is blocked rather than simulated with a substitute program.
7. **No runtime host is selected.** The current repository is a local build baseline, not a persistent execution service.

## Model-routing finding

The available Hugging Face integration was inspected. It exposes Hub discovery, repository metadata/files, and Spaces tooling, but **no text-generation or coding-inference invocation capability**. Therefore the required Hugging Face coding route cannot currently be executed through the available connector. The repository records a fail-closed routing policy: no model is marked qualified until a connector exposes a pinned inference endpoint and passes the held-out Rust/Anchor/security benchmark.

## Required next gate

The immediate engineering scope remains the unmerged Gate D hardening items: property/fuzz scaffolding, memory-tool provenance and correction hardening, repository-index provenance correction, documentation reconciliation, and relay-interface documentation. Gate E external-audit preparation follows only after Gate D is completed and owner-approved. A project-owned Shadow Paymaster devnet test remains a later, separately approved Gate F action. Jupiter remains a hard non-mainnet block; Jito testnet may be observed read-only only. A human approval is required before deployment, test-payer funding, transaction submission, remote signer connection, relay activation, or bundle submission.
