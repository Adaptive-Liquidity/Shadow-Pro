# Shadow Account Protocol — End-to-End Build and Non-Mainnet Test Plan

**Status:** Active evidence-led plan.
**Repository:** [`Adaptive-Liquidity/Shadow-Pro`](https://github.com/Adaptive-Liquidity/Shadow-Pro).
**Merged baseline:** PR [#1](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/1) merged at `d92f83b4d05fe1af484baf4f38718c39c2ef2ee2`; Gate C remediations merged through PR [#5](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/5) and PR [#6](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/6); Gate D CI/SBOM hardening merged through PR [#8](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/8) at `03bc0332efb573589eeae1a80d9fb002dfa7400a`.
**Scope:** Build and verify the protocol before any mainnet decision. **No mock-program substitution is permitted.** Every public-environment claim must use real, source-locked dependencies or remain blocked.

> **Execution boundary:** This plan does not authorize production deployment, funding, key creation, provider connection, signer activation, bundle submission, mainnet interaction, or capital movement. Read-only RPC and public documentation research are allowed. Any state-changing public-network action requires a separate explicit approval.

## 1. Verified environment decision

| Capability | Devnet | Testnet | Mainnet-beta | Current decision |
|---|---|---|---|---|
| Shadow Paymaster deployment and isolated program tests | Supported after a separate deployment/test-payer approval. | Supported after a separate deployment/test-payer approval. | Not authorized. | Test only the project-owned program and test-only state in non-production. |
| Jupiter Flashloan at official ID `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS` | **Not deployed:** finalized `getAccountInfo` returned `null` at slot `484639258`. | **Not deployed:** finalized `getAccountInfo` returned `null` at slot `429889334`. | Deployed executable program at observed slot `439765127`. | A full real Jupiter Flashloan workflow is blocked on devnet and testnet. |
| Jito Block Engine bundle transport | Not published/supported. | Official public endpoint exists. | Official public endpoint exists. | Use testnet for read-only Jito adapter/schema validation only until separate submission approval. |
| DontFront enforcement | Explicitly unsupported. | Supported through Jito Block Engine only. | Supported through Jito Block Engine only. | Do not claim DontFront protection on devnet. |
| Full three-transaction real Jupiter + Jito bundle | Blocked. | Blocked by unavailable Jupiter Flashloan. | Not authorized. | Never substitute mainnet merely to complete a test. |

The official Jupiter program-address table labels the published Flashloan program as **Mainnet**. Its real Flashloan instructions must be ordered `borrow → custom logic → payback` in one atomic transaction. The public Jito endpoint table lists mainnet and testnet, while Solana documents DontFront as a Jito mainnet/testnet feature only. [1] [2] [3]

## 2. Non-negotiable protocol controls

The protected execution unit is exactly three ordered Jito transactions:

| Transaction | Role | Required contents |
|---:|---|---|
| TX-1 | `execute_flash_route` | Compute budget → read-only DontFront → paymaster prepare → flash borrow → allowlisted route → flash repay → paymaster finalize. |
| TX-2 | `distribute_profit` | Validate finalized settlement record → transfer the fixed paymaster share. |
| TX-3 | `treasury_settle_and_tip` | Transfer the fixed treasury share → complete settlement → bounded Jito tip as final instruction. |

No provisioning, ATA creation, rent funding, allocation, maintenance, or setup instruction may enter the protected bundle. The agent remains a zero-SOL intent authority: it is never the fee payer, vault owner, rent payer, treasury owner, transaction submitter, or unrestricted transfer authority. The testing payer is a separately controlled, test-only non-agent account; this does not change the agent invariant.

## 3. Immutable Jupiter evidence and retention

The project retains the supplied source-locked Jupiter Flashloan IDL for later use only:

| Evidence field | Verified value |
|---|---|
| Source commit | `33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9` |
| Raw artifact | `target/idl/flashloan.json` |
| Git blob | `0d0ae6d624b33355315e98baaf0a5d00d317beb8` |
| Raw size | 9,476 bytes |
| SHA-256 | `7fac42ff8320d70162f81c610cb985418a11ed8d40f09a0b2cc3809fc25ef4be` |
| Program ID encoded in IDL | `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS` |
| Instructions | `flashloan_borrow` and `flashloan_payback`, each with `amount: u64` |

The shared evidence artifact is `evidence/jupiter-flashloan/flashloan_33a22cf7.json`. It is interface evidence only. It does **not** prove non-mainnet deployment, usable liquidity, administrator state, account relations, token compatibility, ALT validity, or a permitted integration. The Jupiter source lock remains `blocked` until a real supported non-mainnet environment exists and all decoder, account, liquidity, and review requirements pass. [1] [4]

## 4. Testing sequence before mainnet

### Gate 0 — Governance, reproducibility, and evidence

Maintain protected `main`, required `Deterministic validation` CI, secret/push protection, dependency alerts, immutable commit evidence, and the durable verified-state ledger. Every change requires a PR, reproducible command output, a residual-risk statement, and owner review before merge. `CODEOWNERS` is established under `@Adaptive-Liquidity`; the owner may use external models or platforms as advisory review inputs, but their output never replaces deterministic evidence or release authority.

### Gate 1 — Read-only real-network verification

Run only public, non-mutating requests. Record endpoint, retrieval time, response context slot, raw response hash, and parsed result.

| Check | Cluster | Method | Acceptance rule |
|---|---|---|---|
| Jupiter deployment | Devnet, testnet, mainnet | `getAccountInfo` with `commitment: finalized` for the source-locked program ID. | A `null` result is a hard block on that cluster. |
| Jupiter dependencies | Any candidate cluster | `getMultipleAccounts` at a pinned context slot for program, liquidity, vault, rate model, mint, token program, and instructions sysvar. | Missing account, wrong owner/executable state, or relation mismatch blocks integration. |
| Jito testnet reachability | Testnet | `getTipAccounts`; `getInflightBundleStatuses` with a synthetic unknown ID. | Require schema-valid response only; no transaction data is sent. |
| Jito status parser | Testnet | Parse `Invalid`, `Pending`, `Failed`, and `Landed` without submitting a bundle. | Unknown/unrecognized status must fail closed. |
| Solana RPC/version | Each candidate cluster | `getVersion`, `getSlot`, `getLatestBlockhash`, and account reads. | Record cluster identity and slot drift; never reuse production config. |

Use the exact documented Jito testnet endpoint `https://testnet.block-engine.jito.wtf/api/v1` for read-only JSON-RPC schema checks. `getTipAccounts` is discovery data, not a static allowlist: require exactly eight unique valid public keys, hash the ordered result, record retrieval time and endpoint, and refresh it immediately before any future approved candidate assembly. [2]

### Gate 2 — Project-owned devnet program validation

This is a real devnet test of the Shadow Paymaster only; it is **not** a Jupiter or Jito end-to-end test.

1. Obtain separate approval for a test-only deployment authority and fee payer. The agent remains unfunded.
2. Deploy the reviewed paymaster build to devnet and record program ID, verified build hash, deployer public key, upgrade authority policy, compiler/toolchain version, and configuration hash. Do not reuse a future mainnet program ID or key.
3. Provision test-only mint, vault, settlement records, and destinations in a setup workflow outside the protected bundle. Record only public addresses and no credentials.
4. Execute and simulate direct paymaster state-transition tests against devnet: `Prepared → Finalized → Distributed → Complete`, pause handling, fixed vault/mint/destination validation, nonce replay rejection, insufficient-profit rejection, fee-cap rejection, stale-slot rejection, duplicate distribution rejection, and exact 15/85 rounding behavior.
5. Prove before and after every test that the agent balance remains exactly zero SOL and that the designated test payer, not the agent, paid transaction fees.
6. On mismatch, pause the program, archive logs/receipts, return the configuration to blocked, and stop further public testing.

### Gate 3 — Independent transaction decoding and simulation

Before a real flashloan-supported environment can be admitted, the composer must:

1. Build versioned transactions and independently decode their static keys, Address Lookup Table keys, header permissions, compiled instruction data, and account metas. Caller-supplied decoded fields are never authoritative.
2. Compare decoded Jupiter borrow/payback data to the retained immutable IDL and reject unknown discriminator, account-count change, signer/writable escalation, substituted fixed program/sysvar, changed amount, missing/duplicate/reordered payback, route outside TX-1, or flash instruction outside TX-1.
3. Bind exact serialized message bytes, SHA-256, canonical manifest hash, payer, signer graph, ALTs, blockhash, expiry, configuration hash, source-lock hash, settlement destinations, fees, tip limit, nonce, and simulation receipt before signature request.
4. Perform two simulation modes: an unsigned/placeholder-signature simulation with `replaceRecentBlockhash: true`, followed—only after a signer is separately qualified—by a final signed simulation with `sigVerify: true`, `replaceRecentBlockhash: false`, and the exact signing blockhash. Simulation never counts as a bundle landing proof. [5] [6]
5. Require strict worst-case net profit in atomic units after repayment obligation, network fee, priority-fee ceiling, tip ceiling, slippage, token fees, and configured margin. Do not compare different mints without a source-locked valuation method.

### Gate 4 — Remote signer qualification, no provider activation yet

Turnkey and AWS KMS are candidates only. Neither is approved until it proves Solana-compatible signing of the unchanged serialized message using a raw 64-byte Ed25519 detached signature.

| Qualification control | Required pass condition |
|---|---|
| Test identity | Dedicated, unfunded, non-production identity with no authority over vaults, treasuries, programs, or public funds. |
| Golden vectors | At least a minimal v0 message, an ALT-heavy candidate message, and a one-byte negative mutation. |
| Exact binding | Provider receives exact message bytes once, a short expiry, a single-use idempotency key, and immutable manifest/message hashes. |
| Response validation | Same request ID, expected public key/algorithm, returned payload hash, and exactly 64-byte detached Ed25519 signature. |
| Local verification | Verify the signature over original bytes locally, reserialize, and independently decode before signature insertion. |
| Reliability measurement | At least 100 samples per approved vector; record p50/p95/p99, timeout rate, error taxonomy, correlation ID, policy ID, and local verification result without raw payloads or secrets. |
| Failure policy | Any timeout or ambiguous response invalidates the candidate; retire idempotency key, discard bytes/signatures, obtain a fresh blockhash, rebuild and re-admit. Never blind retry. |

Provider connection, test-key creation, signing, sponsorship, transaction management, broadcast, and production key creation each require separate approval. [7] [8]

### Gate 5 — Jito testnet adapter and MEV controls

Jito testnet can validate real relay *observation* but cannot remedy absent Jupiter testnet Flashloan support.

1. Implement a typed testnet adapter for `getTipAccounts`, `getInflightBundleStatuses`, and `getBundleStatuses`. Preserve endpoint ID, retrieval slot/time, request ID, response hash, and normalized status.
2. Treat `sendBundle` acknowledgement as receipt only, never as execution or success. A future submission can be considered landed only after matching expected transaction signatures, no error, expected slot, `finalized` confirmation in `getBundleStatuses`, and independent Solana RPC finality/account-delta checks.
3. Encode DontFront only for testnet/mainnet Jito paths. Require the read-only non-signer DontFront account in TX-1 at bundle index 0. Reject its presence or any claimed protection on devnet. [3]
4. Reject stale or duplicate tip accounts, status disappearance, conflicting terminal states, partial bundle evidence, non-final tip, tip above cap, duplicate nonce, stale blockhash, or any non-source-locked transaction mutation.
5. Do not submit any Jito testnet bundle until an explicit approval names the exact isolated test assets, test payer, bounded fee/tip, endpoint, signer policy, expected result, and rollback/stop condition.

### Gate 6 — Full real end-to-end public test admission

A genuine three-transaction Jupiter + Jito test is permitted only if **all** conditions become true on one supported non-production cluster:

1. Jupiter publishes or confirms a non-production Flashloan program ID, immutable IDL, usable liquidity, and required dependent accounts.
2. Read-only RPC verifies program executable state, account ownership/relations, mint/token compatibility, liquidity, and all required account data at a pinned slot.
3. The independent decoder, source-lock review, test-only signer, simulation pipeline, paymaster deployment, and Jito adapter are all qualified.
4. A separate explicit approval covers one bounded non-production submission.

Until then, the full workflow remains blocked. The project must not call a devnet paymaster-only test, a Jito testnet schema probe, or a single-transaction simulation an end-to-end flashloan bundle test.

### Gate 7 — Security assurance and external audit

Before mainnet consideration, complete account/PDA/CPI/token-program review; deterministic fuzz/property/mutation testing; dependency/action review; SBOM; reproducible build records; threat-model update; and an independent external audit. All critical/high findings require remediation and retest or formal accountable risk acceptance.

Model assistance remains non-authoritative: apply `solana-professional` to Rust/Anchor, `shadow-account-protocol` to paymaster/economic controls, and `shadow-execution-gate` to composer/relay work. OpenAI, Gemini, and Hugging Face can assist research or review but never decide admission, simulate authoritatively, sign, submit, set risk limits, or approve release.

## 5. Mainnet decision package

Mainnet is a separate governance decision, not a technical continuation. It requires protected and reviewed source; immutable source locks for every program, account, endpoint, signer, mint, ALT, vault, destination, and policy; proven decoder/simulation/signature receipts; completed approved public evidence; qualified signer and relay; external audit; monitoring; alerting; pause and recovery drills; custody/upgrade controls; and individual approvals for deployment, production keys, funding, provider activation, relay access, and a bounded canary.

A **no-go** conclusion is the correct result whenever any condition is absent.

## 6. Durable evidence and stop conditions

At each gate, record commit, exact commands, source-lock hash, endpoint/cluster, context slot, response or artifact hash, test result, reviewer, residual limitation, and next approval in `SHADOW_ACCOUNT_VERIFIED_STATE.md`. Immediately stop on an unpinned dependency, missing program, IDL/hash discrepancy, unexpected account meta, altered message bytes, nonzero agent balance, stale simulation, unsafe fee/tip, signer ambiguity, relay-status conflict, test flake, or missing approval.

## References

[1]: https://developers.jup.ag/docs/lend/program-addresses "Jupiter Lend program addresses"
[2]: https://docs.jito.wtf/lowlatencytxnsend/ "Jito Low Latency Transaction Send"
[3]: https://solana.com/docs/defi/mev-protection "Solana MEV Protection with Jito DontFront"
[4]: https://raw.githubusercontent.com/jup-ag/jupiter-lend/33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9/target/idl/flashloan.json "Immutable Jupiter Flashloan IDL"
[5]: https://solana.com/docs/core/transactions/transaction-structure "Solana transaction structure"
[6]: https://solana.com/docs/rpc/http/simulatetransaction "simulateTransaction RPC"
[7]: https://docs.turnkey.com/features/networks/solana "Turnkey Solana support"
[8]: https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html "AWS KMS Sign API"
