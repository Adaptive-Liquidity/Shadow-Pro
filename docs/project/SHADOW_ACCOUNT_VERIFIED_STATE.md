# Shadow Account Protocol — Verified State Ledger

**Purpose:** This is the durable cross-task memory for Project AGENT-SOL. It records only verified facts, explicit approvals, reproducible evidence, and hard blockers. It is not a source of authority for signing, funding, deployment, or transaction submission. Update it only after the referenced evidence is independently checked.

**Last evidence update:** 2026-08-17.
**Canonical repository:** `https://github.com/Adaptive-Liquidity/Shadow-Pro`.
**Active review path:** Pull request [#1](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/1), branch `manus/bootstrap-security-baseline-v2`, based on `main` history.
**Do not merge:** the earlier `manus/bootstrap-security-baseline` branch has no common history with `main`; it exists only as a failed bootstrap attempt and must never be merged or force-pushed.

## Authority and evidence rules

| Rule | Durable requirement |
|---|---|
| Evidence hierarchy | Deterministic source code, executed test output, immutable artifacts, reviewed source locks, and on-chain receipts outrank plans, model output, or documentation prose. |
| Unknowns | If an external program ID, IDL hash, account map, signer capability, relay endpoint, or status semantic is not pinned and tested, treat it as **blocked**. |
| Models | OpenAI, Gemini, and Hugging Face models are development/review assistants only. They cannot decide admission, decode authoritative transaction bytes, simulate, sign, submit, change risk parameters, or approve release. |
| Research routing | **User preference:** use OpenAI/ChatGPT first for unresolved questions and research. Treat its output as a research aid; verify material claims against primary sources, immutable artifacts, read-only RPC evidence, and deterministic tests before recording a project decision or changing code/configuration. |
| Source-lock changes | A `blocked` dependency may change only after first-party immutable artifact capture, raw-byte hash, decoder comparison, negative fixture tests, and independent review. |
| Release authority | No code path or model can authorize production. Every deployment, funding, signer activation, endpoint enablement, public-test progression, or mainnet canary needs separate human approval. |

## Verified protocol topology and invariants

> **Resolved topology:** The protected Jito bundle has exactly **three transactions**, not five separate transactions. TX-1 contains compute budget, DontFront, paymaster prepare, flash borrow, allowlisted route, flash repay, and paymaster finalize in one atomic Solana transaction. TX-2 distributes the fixed paymaster share. TX-3 settles the fixed treasury share and ends with the bounded Jito tip. This corrects the earlier ambiguous “five-instruction Jito bundle” wording.

| Invariant | Verified implementation evidence | Current boundary |
|---|---|---|
| Zero-capital agent | The TypeScript local harness rejects any positive agent lamport balance; the deterministic signer graph requires the paymaster, not the agent, as fee payer. | Proven only for fixtures; no public-network assertion exists. |
| Atomic flash flow | Jupiter documentation states borrow, execute, and payback must occur in the same transaction. The composer isolates route/flash instructions to TX-1. | Jupiter source lock is still blocked. The official Flashloan program ID resolves `null` on devnet and testnet; the project forbids mock-program substitution, so no full non-mainnet Jupiter flow can run unless Jupiter provides a supported deployment. |
| Deterministic settlement | Anchor `shadow_paymaster` fixes the config-owned mint, vault, destinations, PDA state machine, pause switch, nonce record, and checked 15/85 split. | The program uses a local template ID and has no approved deployment ID. |
| Canonical manifest | The composer checks three transaction roles, program/account/ALT allowlists, signer graph, fee/tip ceilings, slot freshness, nonce replay, fixed destinations, exact simulation message hashes, and profit. | Real versioned-transaction/ALT decoding remains to be implemented and independently tested. |
| Exact signature receipt | The composer verifies Ed25519 signatures over exact serialized message bytes and expected signer/expiry binding. | No remote signer provider has been selected, connected, or exercised. |
| Relay safety | The fake relay rejects duplicate nonce submission, expiry retry, terminal-status mutation, and treats an unrecognized bundle as unknown. The Jito testnet `getTipAccounts` endpoint was read-only verified to return eight pubkeys. | Testnet observation does not authorize bundle submission; final status semantics still require adapter qualification and separate approval. |

## Verified build and validation evidence

| Scope | Verified result | Evidence location |
|---|---|---|
| Rust formatting | Passed. | `cargo fmt --check` on PR branch. |
| Anchor unit tests | 5 passed: program ID, exact 15/85 split, repayment shortfall, strict minimum, arithmetic overflow. | `cargo test -p shadow_paymaster`. |
| Anchor compiler check | Passed with four known Anchor macro `unexpected_cfg` warnings; no Rust compile errors. | `cargo check -p shadow_paymaster`. |
| Composer type check | Passed. | `pnpm build`. |
| Composer adversarial suite | 32 passed across manifest, immutable Jupiter Flashloan decoder, source-lock, signer, local-harness, and fake-relay tests. The Jupiter suite accepts exact immutable borrow/payback bytes and rejects all signer/writable meta mutations, fixed-account substitutions, malformed payloads, unsupported discriminators, zero amount, missing/duplicated/reordered/altered payback. | `pnpm build && pnpm test` on commit `2aee6b8f4d216ecffd02dfd27da577ad5c61c7a3`; remote CI run `31987555281` passed. |
| Production dependency audit | Passed; no known vulnerabilities reported. | `pnpm audit --prod --audit-level high`. |
| Secret-pattern check | Passed; no configured credential material or private-key-like file found. | `bash scripts/check_secrets.sh`. |
| Source-lock check | Passed; Jupiter and Jito remain fail-closed. | `node scripts/check_source_lock.mjs`. |
| Pull-request CI | The `Security Baseline CI` check passed after the pnpm setup-order correction, for immutable Jupiter evidence commit `d2bbd3ceb7597ff2b46817585faeade868af00c5` (run `31987192651`), and for devnet-readiness commit `09cb57f344226b8eb861112da55e020eeb2584c0` (run `31990649117`). | PR #1 workflow history. |

## Confirmed external-interface facts

| Integration | Confirmed first-party fact | Status |
|---|---|---|
| Jupiter Flashloan | Official mainnet program address: `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS`. Immutable IDL commit `33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9` is retained as shared evidence at `SHADOW_JUPITER_FLASHLOAN_33A22CF7.json`; its raw SHA-256 is `7fac42ff8320d70162f81c610cb985418a11ed8d40f09a0b2cc3809fc25ef4be`. It declares `flashloan_borrow` and `flashloan_payback`, each `u64 amount`, and 14 ordered account metas. Finalized read-only `getAccountInfo` returned `null` for this ID on devnet at slot `484635078` and testnet at slot `429893690`; mainnet-beta returned an executable BPF-loader program at slot `439767144`. | **Blocked:** no official non-production Flashloan deployment is currently verified. Under the no-mock policy, full Jupiter integration cannot be tested on devnet/testnet. The retained IDL is future interface evidence only. |
| Jito bundle API | Bundles are documented as sequential, atomic, and up to five transactions. `sendBundle` acknowledgement does not prove landing; status APIs and tip-account retrieval exist. The published testnet endpoint `https://testnet.block-engine.jito.wtf/api/v1` was read-only probed: `getTipAccounts` returned eight pubkeys. | **Blocked:** Jito testnet permits observation, not integration authorization. Tip accounts must be fetched and hashed at candidate-admission time; status parsing, endpoint policy, and a future bounded submission still require qualification and separate approval. |
| DontFront | A read-only non-signer `jitodontfront*` account makes Jito require its transaction at bundle index 0; it is a Jito mainnet/testnet feature rather than localhost/devnet protection. | Policy and fixtures only; no live use. |
| Remote signer candidates | Turnkey documents Solana support; AWS KMS documents Ed25519 asymmetric signing. | **Blocked:** neither is selected, configured, or tested. Exact-byte signing-only behavior remains mandatory. |

## Verified non-mainnet test procedure

1. Perform read-only cluster and dependency checks first: `getVersion`, `getSlot`, `getAccountInfo`, and `getMultipleAccounts` at a recorded context slot. Record raw-response hashes and treat any missing/unpinned program, liquidity, or relation as a block.
2. On devnet, test only the project-owned paymaster after a separately approved test-only deployment. Use a distinct fee payer, configuration, program ID, mints, vaults, and destinations; prove agent SOL is zero before and after every test.
3. For Jito testnet, allow only read-only adapter validation until a separate bounded-submission approval. Fetch `getTipAccounts` immediately before future candidate assembly; require eight unique pubkeys, a timestamp, endpoint identifier, and digest of ordered response. A `sendBundle` acknowledgement would be receipt only, never landing proof.
4. Qualify any remote signer against unfunded synthetic vectors before connection or signing: minimal v0 message, ALT-heavy message, and one-byte mutation. Require raw 64-byte Ed25519 signature, exact-message local verification, expiry, idempotency, timeout retirement, and 100-sample latency evidence per approved vector.
5. A full real Jupiter + Jito bundle remains unavailable until one non-production cluster verifiably hosts all required real dependencies. Never substitute mainnet or mock programs to bypass this block.

## Deliberate hard blocks

| Item | Status | Unlock evidence required |
|---|---|---|
| Jupiter route composition/CPI | Blocked. | A real, official, source-locked non-production Jupiter Flashloan deployment, usable test liquidity, pinned account relations, versioned-transaction fixture comparison, source-lock review, and independent review are required. **Mock substitution is prohibited.** |
| Jito relay | Blocked. | Testnet endpoint and tip-account response are read-only verified. A typed status adapter, tip-response freshness/hash rule, DontFront construction proof, endpoint policy, and review are still required before any bounded submission approval. |
| Remote signer | Blocked. | Provider selection approval, unfunded test identity, synthetic golden vectors, local Ed25519 verification, idempotency/expiry/timeout behavior, audit evidence, and measured latency. |
| Devnet paymaster-only tests | Readiness baseline complete; public test remains blocked pending separate approval. | Commit `09cb57f` adds deny-by-default config `config/devnet-readiness.template.json`, CI guard `scripts/check_devnet_readiness.mjs`, read-only zero-agent snapshot collector `scripts/collect_devnet_readiness_snapshot.mjs`, readiness runbook, and approval template. The test still requires a reviewed test-only deployment, isolated test payer/mints/vaults, zero-agent-SOL balance proof, state-transition/failure tests, and public evidence. It must not be described as a Jupiter or Jito end-to-end test. |
| Full real public test | Blocked. | One supported non-production cluster must host both a verified Jupiter Flashloan integration and Jito-compatible bundle path; then all decoder, signer, simulation, paymaster, relay, and explicit submission gates must pass. |
| Public test environment | Blocked. | All preceding gates, source locks, audit progress, explicit human approval, test assets only, and zero-agent-balance assertions. |
| Mainnet | Blocked. | Separate governance decision after audit, signer, relay, reproducible public-test evidence, program ID, custody, monitoring, pause/rollback, and canary approval. |

## Governance and repository facts

The canonical remote repository is public and its `main` branch initially contained one commit with one README. The complete baseline is in PR #1, never merged. On 2026-08-17, the active GitHub branch ruleset `Protect main branch` (ID `20923759`) was verified through the repository API: it targets the default branch and enforces deletion protection, force-push blocking, a pull request with one approval, stale-review dismissal, the current branch requirement, and the GitHub Actions `Deterministic validation` required check. GitHub private vulnerability reporting, dependency graph, Dependabot alerts, Dependabot security updates, Dependabot malware alerts, secret protection, and push protection are enabled. CodeQL has not been configured; enable it only through a reviewed workflow change. Code owners, named reviewer accounts, and a project board remain unconfigured. Do not merge PR #1 until a qualifying human review is recorded.

## Maintenance protocol

1. Update this ledger only after a factual milestone has reproducible evidence.
2. State the exact artifact, commit, test command/result, source-lock version, reviewer, and residual limitation for every update.
3. Move an item from **blocked** to **qualified** only when all listed unlock evidence is completed; do not use “partially verified” as permission to execute.
4. Add material corrections here before relying on them in a later task. Preserve superseded decisions with a short reason rather than deleting history.
5. Never store keys, credentials, seed phrases, signed transactions, sensitive endpoint tokens, or funded-wallet details in this file.

## References

[1]: https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/1 "Shadow Account Protocol Bootstrap Pull Request"
[2]: https://dev.jup.ag/docs/lend/flashloan "Jupiter Lend Flashloans"
[3]: https://dev.jup.ag/docs/lend/program-addresses "Jupiter Lend Program Addresses"
[4]: https://raw.githubusercontent.com/jup-ag/jupiter-lend/33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9/target/idl/flashloan.json "Immutable Jupiter Flashloan IDL"
[5]: https://docs.jito.wtf/lowlatencytxnsend/ "Jito Low Latency Transaction Send"
[6]: https://solana.com/docs/defi/mev-protection "Solana MEV Protection with Jito DontFront"
[7]: https://docs.turnkey.com/features/networks/solana "Turnkey Solana Support"
[8]: https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html "AWS KMS Cryptography Essentials"
