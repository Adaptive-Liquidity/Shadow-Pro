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
| Composer strict TypeScript build | Passed. |
| Composer adversarial tests | 15 passed: canonicalization, exact split, topology, destination, tip account, stale simulation, insufficient profit, nonce replay, exact-message signature, signer substitution, source lock. |
| Anchor program formatting | Passed. |
| Anchor program unit tests | 5 passed: program ID, exact 15/85 split, repayment shortfall, strict minimum, arithmetic overflow. |
| Anchor program compiler check | Passed with four known Anchor macro `unexpected_cfg` warnings under Rust 1.97 / Anchor 0.32.1; no Rust compile errors. |
| Project skills validation | 3 of 3 valid. |

## Execution blockers

The following are deliberate hard stops. Do not work around any of them with environment variables, mock production values, or manual transaction submission.

1. **Jupiter Flashloan remains blocked.** Pin an immutable official target/IDL revision, SHA-256, account map, and a local fixture proving exact one-transaction borrow → route → repay semantics.
2. **Jito relay remains blocked.** Pin the authenticated endpoint, status model, current tip-account retrieval, and a local or sanctioned non-production integration fixture.
3. **Remote signer remains unselected.** Run the provider golden vector against exact Solana serialized messages, enforce idempotency and request expiry, and measure p99 latency before any signer becomes eligible.
4. **No program ID or deployment key is approved.** The program currently uses the Anchor local template ID; it is not a deployment authorization.
5. **No local validator integration test is approved.** Build one only after the source-locked external CPI interfaces are available; it must use local/mock dependencies and no real funds.
6. **No runtime host is selected.** The current repository is a local build baseline, not a persistent execution service.

## Model-routing finding

The available Hugging Face integration was inspected. It exposes Hub discovery, repository metadata/files, and Spaces tooling, but **no text-generation or coding-inference invocation capability**. Therefore the required Hugging Face coding route cannot currently be executed through the available connector. The repository records a fail-closed routing policy: no model is marked qualified until a connector exposes a pinned inference endpoint and passes the held-out Rust/Anchor/security benchmark.

## Required next gate

Complete the source-lock and signer provider spikes, then add a deterministic local-validator test harness. A human approval is required before enabling any network endpoint, remote signer, deployment key, vault funding, or bundle submission.
