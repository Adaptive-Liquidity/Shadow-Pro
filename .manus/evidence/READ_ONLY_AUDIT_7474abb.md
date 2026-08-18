# Shadow-Pro Read-Only Audit

**Candidate commit:** `7474abb1fe49f45458ba69e5cc3becbbdaefd5f7`
**Branch:** `manus/bootstrap-security-baseline-v2`
**Pull request:** [#1](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/1)
**Audit mode:** Static/read-only source and configuration review. No project code, transactions, deployment, signing, funding, relay, or external protocol integration was executed.
**Scope date:** 2026-08-18

## 1. Current-state map

| Area | Current implementation | Authority boundary | Current state |
|---|---|---|---|
| On-chain paymaster | Anchor program with config, fixed PDA vault authority, settlement PDA, pause state, and three-state distribution lifecycle. | Governance initializes/configures and pauses; agent prepares/finalizes; PDA transfers tokens. | Non-production and not deployed. |
| Settlement topology | `prepare_settlement` → `finalize_settlement` → `distribute_paymaster` → `settle_treasury`. | Program state and account constraints determine transfer authority. | Core constraints are incomplete; see verified findings. |
| Composer | TypeScript manifest policy gate with role/classifier checks, fee calculation, nonce check, and profit split. | Caller supplies decoded transaction and `GatePolicy`; code does not yet independently derive every trusted field. | Fail-closed checked-in lock, but executable-policy architecture needs correction. |
| Jupiter | Immutable IDL artifact and a fixed-account decoder are retained. | `config/sources.lock.json` keeps Jupiter blocked. | Mainnet interface evidence only; no non-mainnet full integration authorization. |
| Jito | Fake relay and documentation exist. | `config/sources.lock.json` keeps relay blocked. | No active endpoint, signer, tip transfer, or bundle path. |
| Remote signer | Exact-message receipt verifier exists. | No provider integration or credential. | Parsing and expiry rejection need hardening. |
| Devnet | Deny-by-default template and read-only collector exist. | Config and CI prohibit activation. | No deployment/funding/signing/submission is authorized. |
| Repository governance | PR, code ownership, protected-main rules, and CI exist. | `main` remains review-gated. | Current PR is open, blocked, and awaiting review. |

## 2. Verified safety posture

The candidate contains no configured private key, remote-signer credential, live Jito endpoint, funded-wallet configuration, deployment key, or enabled Jupiter/Jito source-lock entry. The checked-in source lock marks the Shadow Paymaster as `local-only`, Jupiter Flashloan as `blocked`, and Jito Block Engine as `blocked`.

This audit makes **no claim** that the program is deployment-ready, that a full transaction is atomically safe, or that an external integration is qualified.

## 3. Verified security findings

### Critical: `FinalizeSettlement` accepts a substitute vault

**Evidence:** `programs/shadow_paymaster/src/lib.rs`, `FinalizeSettlement` accepts `profit_vault` with mint, token-authority, and token-program constraints, but lacks `address = config.profit_vault`. The prepare/distribute/treasury paths already bind this address.

**Exploit path:** A token account can be created with the configured vault PDA as its authority and the configured profit mint. If its balance differs from the real configured vault, `finalize_settlement` calculates shares from the substitute balance, records them in settlement state, and later `distribute_paymaster` / `settle_treasury` transfer those recorded shares from the real configuration-bound vault. This breaks principal protection.

**Required remediation:** Bind `FinalizeSettlement.profit_vault` to `config.profit_vault`; add a regression test that a same-mint/PDA-authority substitute is rejected; review all other mint/vault/destination account paths for the same substitution class.

### High: composer execution admission trusts caller-provided source-lock state

**Evidence:** `composer/src/types.ts` exposes `GatePolicy.sourceLockAllowsExecution` as a Boolean. `composer/src/gate.ts` uses it directly. The canonical `config/sources.lock.json` is not parsed or validated by admission.

**Impact:** A caller that constructs policy can set this Boolean true even if the repository source lock remains blocked.

**Required remediation:** Derive admission eligibility from canonical source-lock parsing and schema validation. Remove or make impossible the mutable caller override. Add tests proving a blocked/unknown/duplicate/missing-name lock cannot be admitted.

### High: transaction topology is presence/order-only rather than exact-once

**Evidence:** `composer/src/gate.ts` uses `indexOf` and does not reject duplicate begin/borrow/repay/finalize classifiers, a route outside the borrow-to-repay window, instructions after finalization, or a non-first DontFront marker. The current test removes DontFront rather than relocating it.

**Impact:** An attacker could exploit classifier duplication or placement ambiguity if decoder admission treats additional instructions as valid.

**Required remediation:** Enforce exactly one critical lifecycle classifier, exactly ordered sequence, routes only between borrow and repay, no post-finalize instruction, and DontFront at the exact required position. Add mutation tests for every violation.

### High: decoded settlement destinations and Jito tip amount are not cryptographically bound

**Evidence:** `DecodedInstruction` exposes only classifier, program ID, data hash, and account indexes. `hasOnlyAllowedAccounts` validates account-owner programs but does not bind distribution/treasury/tip instruction account positions to the configured destinations. Fee logic compares the declared `maxTipLamports`, but cannot derive the actual decoded tip transfer amount.

**Impact:** A manifest can declare safe destinations/tip while decoded instructions direct transfer semantics elsewhere or use a greater tip.

**Required remediation:** Define classifier-specific decoded instruction semantics; resolve and bind destination account metas and exact system-transfer amounts; derive tip exposure from decoded bytes, not manifest declarations; reject privilege/meta/order changes.

### High: source-lock schema accepts unknown kinds and ambiguous names

**Evidence:** `composer/src/source-lock.ts` accepts arbitrary `kind` strings if status is pinned. `scripts/check_source_lock.mjs` does not require non-empty unique entry names.

**Impact:** Future lock consumers can interpret an ambiguous or unknown entry differently, undermining fail-closed policy.

**Required remediation:** Restrict kinds to `anchor-program`, `external-program`, and `relay`; reject unknown kinds, missing names, duplicate names, and incomplete pinned entries in both runtime and CI validation.

### Medium: amount and receipt parsing have fail-open/error-normalization gaps

| Finding | Evidence | Required remediation |
|---|---|---|
| `parseAtomicUnits` accepts twenty-digit values above `u64::MAX`. | `composer/src/canonical.ts` | Compare parsed value to `2^64-1`; add boundary tests. |
| Malformed `expiresAt` parses to `NaN` and is not rejected. | `composer/src/signer.ts` | Explicitly reject non-finite parsed timestamps before expiry comparison. |
| Invalid Base58 signer input throws an uncontrolled decoder error. | `composer/src/signer.ts` | Normalize decode failures to `INVALID_ED25519_RECEIPT_ENCODING`; add tests. |
| Fake relay stores only TX-1 expiry and does not persist an expiry state. | `composer/src/fake-relay.ts` | Use earliest expiry; persist terminal `Invalid`; reject later status mutation. |
| Fake relay identity excludes nonce. | `composer/src/fake-relay.ts` | Include approval nonce in identity and reject duplicate bundle IDs. |

### Medium: on-chain configuration and lifecycle gaps

| Finding | Evidence | Required remediation |
|---|---|---|
| Paymaster/treasury destinations can equal the profit vault. | `initialize_config` binds destinations only against each other. | Reject both destination-vault equalities; test all three uniqueness relationships. |
| CPI uses `token::transfer`, not `transfer_checked`. | `transfer_from_vault`. | Bind mint/decimals using `transfer_checked`. |
| BPS multiplication may overflow `u64` before division. | `calculate_profit_split`. | Use checked `u128` intermediate and conversion back to `u64`; add boundary/conservation tests. |
| Distribution/treasury instructions do not check settlement expiry and do not require configured agent signer. | Account contexts and handlers. | Treat agent-signature requirement as a formal architecture decision; at minimum enforce expiry and document whether permissionless post-finalization settlement is intentional. |
| `TREASURY_BPS` is unused. | Constant declaration. | Remove it or assert the complement relationship. |

## 4. Documentation and CI gaps

The build-status and threat-model documents overstate some account-binding and composer controls relative to current source. `README.md` still contains a developer-specific checkout path. `docs/EXECUTION_GATES_STATUS.md` has stale governance/Jupiter evidence statements. CI has a useful deny-by-default baseline but lacks pinned action SHAs, Anchor build/IDL hash, Clippy, isolated dependency installation, SBOM/artifact hashing, fuzz/property/mutation jobs, and a tested required-check failure fixture.

## 5. Review status and candidate integrity

PR #1 is open and blocked. Required Security Baseline CI is passing, but automated findings exist, current candidate SHA changed after earlier reviews, and independent human approval is not recorded. Earlier review evidence must not be reused for a later SHA without re-execution.

## 6. Immediate safe next milestone

1. Create a formal finding register pinned to `7474abb`.
2. Remediate the vault-substitution issue and composer source-lock/topology/binding issues in small reviewable commits with regression tests.
3. Re-run affected tests under the revised isolated-review process at each new SHA.
4. Update threat model, execution gate status, build status, and verified-state ledger only after evidence passes.
5. Keep deployment, funding, signing, remote signer connection, Jupiter/Jito activation, and public-network execution blocked.

## 7. Human decisions required

| Decision | Why a human must decide |
|---|---|
| Whether post-finalization distribution must require the agent signer or be permissionless. | It defines authority and liveness/security tradeoffs. |
| Exact signer/approval binding schema and policy version lifecycle. | It determines the authoritative execution contract. |
| Reviewers for program/composer/source-lock changes. | Independent code ownership cannot be inferred. |
| Any public-network test scope. | It requires separately approved identities, caps, and stop conditions. |

## References

[1]: `programs/shadow_paymaster/src/lib.rs` at candidate `7474abb1fe49f45458ba69e5cc3becbbdaefd5f7`.
[2]: `composer/src/gate.ts`, `composer/src/types.ts`, `composer/src/source-lock.ts`, `composer/src/canonical.ts`, and `composer/src/signer.ts` at candidate `7474abb1fe49f45458ba69e5cc3becbbdaefd5f7`.
[3]: `config/sources.lock.json`, `.github/workflows/ci.yml`, `docs/BUILD_STATUS.md`, and `docs/THREAT_MODEL.md` at candidate `7474abb1fe49f45458ba69e5cc3becbbdaefd5f7`.
