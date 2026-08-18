# Shadow Account Protocol — Implementation Plan v1.1

**Status:** Design baseline for a three-engineer implementation team
**Scope:** Architecture, deterministic control specifications, test plan, skills plan, and model-routing policy.
**Production authority:** Human approval, version-pinned configuration, deterministic validation, simulation receipts, and verified cryptographic signatures. **No model may sign a transaction, change an economic parameter, submit a bundle, or move capital.**

> **Risk notice.** This document is an engineering and risk-control design, not guaranteed financial advice. On-chain execution, liquidity, MEV, software, and custody risks remain with the protocol operator; the limits below are conservative operating controls, not a promise of losslessness.

## 1. Purpose, Scope, and Invariants

The Shadow Account Protocol shall let an AI agent propose a tightly bounded Solana execution intent while a separately controlled paymaster supplies fee-payer capability and grants no approval unless deterministic validation and a current simulation receipt meet every policy rule. The protocol shall not describe the agent as risk-free in the absolute. Its enforced invariant is **zero agent capital at risk**: the agent public key maintains a zero SOL balance, is never a fee payer, and owns no spendable vault or treasury authority. The paymaster retains explicitly bounded fee, tip, operational, custody, and software risk.

Solana transactions contain one or more instructions, signers, and a recent blockhash; instructions inside one transaction are atomic, while fees can still be charged when a transaction is included and fails.[1] Jito bundles are a different construct: they contain at most five transactions, execute in listed order in one slot, and are all-or-nothing; acceptance of `sendBundle` only confirms receipt and does not prove landing.[2] Jupiter Lend documents flash loans as fee-free, collateral-free borrow-and-repay flows that must repay within the **exact same transaction**.[3]

| ID | Immutable invariant | Enforced by | Required evidence |
|---|---|---|---|
| INV-01 | Agent balance is 0 SOL and agent is never fee payer. | Balance watcher; decoded message fee-payer check; remote-signer policy. | Pre-sign RPC balance receipt; decoded message account index 0; signed policy receipt. |
| INV-02 | Each flash loan’s borrow, all route instructions, and repayment occur in one Solana transaction. | Byte-level transaction decoder; Jupiter instruction-family classifier. | Canonical TX-1 manifest; instruction-order test; simulation receipt. |
| INV-03 | Paymaster signs only exact, approved bytes before expiry and only after the deterministic gate succeeds. | Canonical manifest, SHA-256 bindings, remote-signing policy, nonce ledger. | Manifest hash; message hash; sign receipt; simulation receipt; expiry check. |
| INV-04 | Only pinned programs, mints, token programs, vaults, route accounts, fee/tip limits, and treasury destinations can be used. | Allowlist resolver; on-chain Anchor constraints; decoder. | Configuration hash; decoded account/instruction diff equals manifest. |
| INV-05 | Distributable profit is measured from validated balance deltas and repayment obligations; no caller provides a `profit_amount`. | Paymaster program state machine and token-account validation. | Pre/post balance snapshots; mint/authority checks; checked-arithmetic event. |
| INV-06 | Every safety gate fails closed. | Default-deny implementation and negative tests. | Rejection catalogue and automated test report. |

## 2. Evidence Baseline and Interface Pinning

The team shall maintain `sources.lock.json` in the repository root. A source is **verified** only when the exact URL, retrieval time, version or commit, applicable program ID, and claimed interface are recorded. A floating documentation page can establish an architectural constraint but cannot pin instruction discriminators, account order, or a deployed binary. Those implementation details shall be tied to an exact IDL commit and SHA-256 before code is written.

| Claim | Verified source position | Design consequence |
|---|---|---|
| Network fees | Base fee is 5,000 lamports per signature; prioritization fee is computed from requested CU price and CU limit.[4] | Per-trade maximum network fee shall be calculated from decoded transaction bytes. The protocol shall not hardcode a ten-signature total or USD fee estimate. |
| Transaction message | The first signature belongs to the fee payer; every signer signs the serialized message; normal blockhash lifetime is 150 slots.[5] | The manifest binds the exact serialized message and derives every signer, fee payer, account flag, program, and expiry from decoded bytes. |
| Jito bundles/tips | Jito bundle transactions are sequential and atomic. A tip must transfer SOL to a current Jito tip account; a `sendBundle` response does not guarantee landing.[2] | Bundle status monitoring is mandatory. A tip is a conditional system transfer in the final settlement transaction and is never inferred from an endpoint response. |
| DontFront | A Jito `jitodontfront` transaction must occupy bundle index 0. The control reduces front-running risk but does not guarantee protection.[6] | Protected TX-1 must be first. Any provisioning action occurs out-of-band, not ahead of TX-1 inside the protected bundle. |
| Flash loans | Current Jupiter Lend documentation requires same-transaction repayment and lists the mainnet Flashloan program.[3] [7] | TX-1 is the only flash-loan transaction. Implementation shall pin the actual IDL and program binary/IDL hash before composing instructions. |
| Custom swaps | Jupiter’s Router path returns raw instructions suitable for custom composition; Meta-Aggregator assembled transactions are not modifiable.[8] | The composer may only consume raw-instruction interfaces whose full returned instruction set is decoded and allowlisted. |
| Anchor validation | Anchor provides signer, PDA, owner, address, executable, token/mint/authority constraints, while `remaining_accounts` are not automatically validated.[9] [10] | All privileged accounts require declarative and explicit checks. Unbounded `remaining_accounts` are forbidden. |

### 2.1 Jupiter Lend interface compatibility gate

The current official Lend documentation exposes current Lend products and lists the Jupiter Flashloan mainnet address as `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS`.[7] It confirms same-transaction repayment and zero fees, but the retrieved pages do not provide a version-labelled “Lend V2 flash-loan” change contract. Therefore, the status of a named V2 interface is **blocked, not assumed**.

Before implementation, Engineer A shall retrieve the exact `jup-ag/jupiter-lend` target IDL commit referenced by Jupiter, compute the SHA-256 of the selected IDL, identify every flash-loan account and instruction discriminator, and run a local/testnet fixture that proves the pinned borrow → route → repay sequence. The configuration loader shall refuse to enable an integration if the locked program ID, IDL hash, or documented fee/repayment semantics differ from the verified source record.

## 3. Corrected Execution Architecture

### 3.1 Canonical protected bundle topology

The production topology is a **three-transaction Jito bundle**. It preserves the required same-transaction flash loan and puts the DontFront-marked execution transaction at index 0. The former five-transaction construction is rejected.

```mermaid
sequenceDiagram
    participant C as Composer (deterministic)
    participant G as Paymaster Gate
    participant H as Remote Agent/Paymaster Signers
    participant J as Jito Block Engine
    participant P as Shadow Paymaster Program
    participant L as Jupiter Flashloan
    participant R as Jupiter Router / allowlisted DEXes
    participant T as Treasury

    C->>G: Canonical manifest + decoded TX-1..TX-3 + simulation receipt
    G->>G: Exact-byte, allowlist, profit, drift, expiry checks
    G->>H: Sign exact serialized messages only if allow
    H-->>G: Sign receipts bound to manifest/message hash
    G->>J: Bundle [TX-1, TX-2, TX-3]; TX-1 has DontFront
    J->>P: TX-1 begin_settlement snapshot
    P->>L: Flash-loan borrow
    L->>R: One or more pre-committed route instructions
    R->>L: Flash-loan repay in TX-1
    L->>P: TX-1 finalize measured settlement
    J->>P: TX-2 distribute measured paymaster share
    J->>P: TX-3 transfer measured treasury share; mark complete
    J->>T: TX-3 final instruction: Jito tip transfer
```

| Bundle index | Transaction | Permitted ordered instruction groups | Required signers | Writable-account classes | Fail-closed rules |
|---:|---|---|---|---|---|
| 0 | `TX-1 execute_flash_route` | 1. Compute-budget instructions. 2. Exactly one Paymaster `begin_settlement`. 3. Jupiter flash-loan borrow. 4. Zero or more approved setup-free route instructions. 5. Jupiter flash-loan repay. 6. Exactly one Paymaster `finalize_settlement`. | Paymaster fee payer; agent intent signer; any externally required signer only if present in the locked role map. PDA signatures only through validated seeds. | Settlement PDA; configured profit/vault token accounts; locked Jupiter flash-loan accounts; decoded route accounts; read-only DontFront account. | Must include a read-only `jitodontfront*` account in an allowlisted instruction; must be bundle index 0; no ATA creation, rent funding, arbitrary transfer, unknown program, or unclassified remaining account. |
| 1 | `TX-2 distribute_profit` | 1. Paymaster settlement-state verification. 2. Deterministic transfer of paymaster share. 3. Settlement event. | Paymaster fee payer; program PDA where required. | Settlement PDA; validated profit source token account; pinned paymaster treasury token account. | No caller amount, no arbitrary mint, authority, source, or destination. State must be `Finalized` and not distributed. |
| 2 | `TX-3 treasury_settle_and_tip` | 1. Deterministic treasury-share transfer. 2. Mark settlement complete/close permitted record. 3. **Final instruction only:** Jito tip transfer to a current fetched tip account. | Paymaster fee payer; program PDA where required. | Settlement PDA; profit source; pinned cold treasury; one current tip account. | Must follow TX-2 in the manifest. Tip must be bounded, after every settlement check, and targeted only to the fetched+approved Jito tip-account set. |

The logical “borrow → swap → repay → distribute → settle” sequence therefore remains, but borrow, all swaps, and repayment are correctly collapsed into one transaction. An optional provisioning transaction is **not allowed in the protected bundle**: Jito requires the DontFront-marked TX-1 to be index 0.[6] Associated token accounts, address lookup tables, settlement-record capacity, and route-independent accounts shall be created or refreshed in an idempotent, separately approved maintenance workflow before opportunity detection.

### 3.2 State machine and measured profit

`SettlementRecord` shall be a PDA keyed by `['settlement', paymaster_state, approval_nonce]`. It shall store `Prepared`, `Finalized`, `Distributed`, and `Complete` states; it shall never transition backwards. `begin_settlement` stores the configuration hash, manifest hash, expiry slot, expected mint set, pre-balance snapshots, principal, maximum fee/tip budget, 85/15 basis points, and replay nonce. `finalize_settlement` validates the same record, verifies repayment completion using the pinned interface-specific evidence, measures post-balances, and computes profit with checked arithmetic. `distribute_profit` and `treasury_settle_and_tip` consume only that recorded computation.

For each allowed profit mint `m`, the calculation shall be:

```text
net_delta_m = post_balance_m - pre_balance_m - committed_nonprofit_obligations_m
eligible_profit_m = max(net_delta_m, 0)

paymaster_share_m = floor(eligible_profit_m × paymaster_bps / 10_000)
treasury_share_m  = eligible_profit_m - paymaster_share_m
```

`committed_nonprofit_obligations_m` includes the pinned flash principal, protocol-documented repayment fee (currently zero only while interface verification confirms it), token-transfer fees, and any other manifest-committed obligation denominated in mint `m`. Native SOL fee-payer costs and Jito tip are accounted separately in SOL. A route is admissible only if the normalized net profit after worst-case permitted drift, all decoded fees, priority fee, and tip ceiling exceeds `minimum_net_profit` by strict inequality. Overflow, underflow, unsupported decimal conversion, unknown token extension, a non-pinned token program, or cross-mint valuation ambiguity rejects the settlement.

## 4. HSM/KMS Remote-Signing Specification

The agent process has no private-key material. It sends an authenticated authorization envelope to a remote signer; the signer signs the **exact serialized Solana message bytes** only after independently validating the policy data. The SHA-256 message hash binds the control-plane request; it is not a substitute for the message bytes delivered to an Ed25519 signer.

```json
{
  "request_id": "UUIDv7",
  "idempotency_key_b64": "32-byte opaque value",
  "role": "agent_intent | paymaster_fee_payer",
  "signer_pubkey": "base58",
  "manifest_hash_sha256": "hex",
  "transaction_index": 0,
  "serialized_message_b64": "base64 exact Solana message bytes",
  "message_hash_sha256": "hex",
  "recent_blockhash": "base58",
  "min_context_slot": "u64 decimal string",
  "expiry_slot": "u64 decimal string",
  "allowed_operation": "sign_solana_transaction_message",
  "policy_version": "immutable config hash",
  "issued_at": "RFC3339 UTC",
  "expires_at": "RFC3339 UTC",
  "caller_auth": {"scheme": "mTLS+service-signature", "signature_b64": "base64"}
}
```

| Decision | Mandatory rule |
|---|---|
| Authentication | Mutual TLS and an independently rotated service-control-plane signing key shall authenticate each request. The agent cannot invoke a broad `sign arbitrary bytes` capability. |
| Policy matching | The remote signer shall reconstruct or receive the canonical manifest reference and deny if public key role, message hash, blockhash, expiry, configuration hash, nonce, fee payer, or transaction index differ. |
| Agent balance | Before agent signing, the gate queries the configured RPC balance at or after `min_context_slot`; any nonzero agent SOL balance rejects the request. |
| Idempotency | A signer shall return the original receipt for a matching idempotency key and request digest. A key reused with a different digest rejects. |
| Retry | No blind retry follows timeout or ambiguous provider response. Query provider status by `request_id`/idempotency key; accept one matching receipt or discard the entire opportunity and rebuild with a new blockhash. |
| Latency | Abort a signing attempt exceeding 150 ms. Record p50/p95/p99 per provider, region, and signer role. A late signature is never reused after manifest expiry. |
| Provider mutation | Any provider feature that auto-fills blockhash, CU limit, priority fee, payer, or broadcast is disabled for protected execution. If it cannot be disabled, that provider is ineligible. |
| Verification | The composer verifies every returned Ed25519 signature against the exact message and expected public key before building a complete transaction. |

AWS KMS now documents an Ed25519 key specification and `ED25519_SHA_512`; it requires `RAW` message type for this algorithm and accepts messages up to 4,096 bytes.[11] Because Solana’s normal transaction-message implementation and the KMS Ed25519 format must interoperate exactly, AWS KMS is eligible only after a golden-vector test verifies an AWS-produced signature through the Solana verifier for exact serialized messages. Turnkey documents a Solana remote signer, enclave transaction parsing, and policy support, but its automatic transaction-management functions are ineligible if they mutate approved bytes.[12] The retrieved Coinbase Agentic Wallet documentation describes a self-custody agent wallet that holds/spends assets; it is blocked for the zero-capital agent role until Coinbase documents detached exact-message signing, policy equivalence, and no-balance separation.[13]

| Candidate | Status for agent signer | Required proof before qualification |
|---|---|---|
| AWS KMS `ECC_NIST_EDWARDS25519` | Conditionally eligible. | Solana-compatible golden vector; raw-message mode; 4,096-byte bound; IAM policy; measured p99 under 150 ms; no external byte mutation. |
| Turnkey | Conditionally eligible. | Exact-message signing mode; policy that pins decoded programs/accounts/fees; mutation-disabled workflow; receipt/query semantics; measured p99 under 150 ms. |
| Coinbase Agentic Wallet | Blocked. | Official detached-signing API, zero-balance agent-role architecture, exact-byte signature workflow, policy and latency evidence. |

## 5. Canonical Manifest and Deterministic Gate

The gate shall parse serialized transactions itself. It shall never trust a caller-provided instruction list, account list, profit value, or fee value. Canonical JSON uses UTF-8, sorted object keys, no insignificant whitespace, base10 unsigned-integer strings, lowercase hex, and standard base64. `manifest_hash_sha256` is computed over that canonical representation excluding `approvals`.

### 5.1 Approval decision sequence

| Step | Deterministic check | Reject code examples |
|---:|---|---|
| 1 | Verify schema, canonicalization, nonce uniqueness, policy/configuration revision, and expiry. | `SCHEMA_INVALID`, `NONCE_REUSED`, `POLICY_STALE`, `EXPIRED`. |
| 2 | Decode each transaction and reproduce all manifest fields from its bytes, including v0 ALT resolution. | `MESSAGE_HASH_MISMATCH`, `ALT_UNRESOLVED`, `MANIFEST_DIFF`. |
| 3 | Enforce topology and signer graph: exactly TX-1..TX-3, DontFront in TX-1, expected fee payer/signers, flash borrow/route/repay order. | `TOPOLOGY_INVALID`, `DONTFRONT_NOT_FIRST`, `SIGNER_GRAPH_INVALID`, `FLASH_BOUNDARY_INVALID`. |
| 4 | Enforce exact program/mint/token-program/account/destination/compute/fee/tip allowlists. | `PROGRAM_DENIED`, `ACCOUNT_META_ESCALATION`, `MINT_DENIED`, `FEE_CAP_EXCEEDED`, `TIP_DENIED`. |
| 5 | Verify quote freshness, simulation receipt, balance-delta calculation, maximum drift, and strict positive profit margin. | `QUOTE_STALE`, `SIMULATION_STALE`, `BALANCE_PROOF_INVALID`, `DRIFT_EXCEEDED`, `NET_PROFIT_INSUFFICIENT`. |
| 6 | Request agent/paymaster signatures against exact messages; verify returned signatures locally; submit only the approved bundle ID payload. | `SIGN_TIMEOUT`, `SIGN_RECEIPT_INVALID`, `PARTIAL_SIGNATURE`, `SUBMISSION_DEADLINE_EXCEEDED`. |

### Appendix A — Transaction Manifest JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://shadow-account.example/schema/transaction-manifest-1.1.json",
  "title": "Shadow Account Canonical Transaction Manifest",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version","manifest_id","approval_nonce","policy_hash","simulation","risk","transactions","settlement","approvals"],
  "properties": {
    "schema_version": {"const": "1.1"},
    "manifest_id": {"type": "string", "pattern": "^[0-9a-f-]{36}$"},
    "approval_nonce": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
    "policy_hash": {"$ref": "#/$defs/hash"},
    "created_at": {"type": "string", "format": "date-time"},
    "simulation": {
      "type": "object", "additionalProperties": false,
      "required": ["endpoint_id","simulation_slot","receipt_hash","completed_at","max_slot_delta","quote_expiry_slot"],
      "properties": {
        "endpoint_id": {"type": "string"}, "simulation_slot": {"$ref": "#/$defs/u64"},
        "receipt_hash": {"$ref": "#/$defs/hash"}, "completed_at": {"type": "string", "format": "date-time"},
        "max_slot_delta": {"$ref": "#/$defs/u64"}, "quote_expiry_slot": {"$ref": "#/$defs/u64"},
        "units_consumed": {"type": "array", "items": {"$ref": "#/$defs/u64"}}
      }
    },
    "risk": {
      "type": "object", "additionalProperties": false,
      "required": ["max_base_fee_lamports","max_priority_fee_lamports","max_tip_lamports","max_total_fee_exposure_lamports","slippage_bps","minimum_net_profit"],
      "properties": {
        "max_base_fee_lamports": {"$ref": "#/$defs/u64"}, "max_priority_fee_lamports": {"$ref": "#/$defs/u64"},
        "max_tip_lamports": {"$ref": "#/$defs/u64"}, "max_total_fee_exposure_lamports": {"$ref": "#/$defs/u64"},
        "slippage_bps": {"type": "integer", "minimum": 0, "maximum": 50},
        "minimum_net_profit": {"$ref": "#/$defs/amount"}
      }
    },
    "transactions": {
      "type": "array", "minItems": 3, "maxItems": 3,
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["index","role","serialized_transaction_b64","serialized_message_b64","message_hash","recent_blockhash","expiry_slot","fee_payer","required_signers","instructions","account_metas","alt_addresses","compute"],
        "properties": {
          "index": {"type": "integer", "minimum": 0, "maximum": 2},
          "role": {"enum": ["execute_flash_route","distribute_profit","treasury_settle_and_tip"]},
          "serialized_transaction_b64": {"type": "string"}, "serialized_message_b64": {"type": "string"},
          "message_hash": {"$ref": "#/$defs/hash"}, "recent_blockhash": {"$ref": "#/$defs/pubkey"}, "expiry_slot": {"$ref": "#/$defs/u64"},
          "fee_payer": {"$ref": "#/$defs/pubkey"}, "required_signers": {"type": "array", "items": {"$ref": "#/$defs/signer"}},
          "instructions": {"type": "array", "minItems": 1, "items": {"$ref": "#/$defs/instruction"}},
          "account_metas": {"type": "array", "items": {"$ref": "#/$defs/accountMeta"}},
          "alt_addresses": {"type": "array", "items": {"$ref": "#/$defs/pubkey"}},
          "compute": {"type": "object", "additionalProperties": false, "required": ["unit_limit","unit_price_micro_lamports"], "properties": {"unit_limit": {"$ref": "#/$defs/u64"}, "unit_price_micro_lamports": {"$ref": "#/$defs/u64"}}}
        }
      }
    },
    "settlement": {
      "type": "object", "additionalProperties": false,
      "required": ["settlement_pda","pre_balances","expected_post_deltas","repayment_obligations","profit_mint","paymaster_bps","treasury_bps","treasury_destination","tip_account"],
      "properties": {
        "settlement_pda": {"$ref": "#/$defs/pubkey"}, "pre_balances": {"type": "array", "items": {"$ref": "#/$defs/balance"}},
        "expected_post_deltas": {"type": "array", "items": {"$ref": "#/$defs/balance"}}, "repayment_obligations": {"type": "array", "items": {"$ref": "#/$defs/amount"}},
        "profit_mint": {"$ref": "#/$defs/pubkey"}, "paymaster_bps": {"const": 1500}, "treasury_bps": {"const": 8500},
        "treasury_destination": {"$ref": "#/$defs/pubkey"}, "tip_account": {"$ref": "#/$defs/pubkey"}
      }
    },
    "approvals": {"type": "array", "items": {"type": "object", "required": ["role","signer_pubkey","message_hash","receipt_id","signature_b64","completed_at"], "properties": {"role": {"enum": ["agent_intent","paymaster_fee_payer"]}, "signer_pubkey": {"$ref": "#/$defs/pubkey"}, "message_hash": {"$ref": "#/$defs/hash"}, "receipt_id": {"type": "string"}, "signature_b64": {"type": "string"}, "completed_at": {"type": "string", "format": "date-time"}}}}
  },
  "$defs": {
    "hash": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
    "u64": {"type": "string", "pattern": "^(0|[1-9][0-9]{0,19})$"},
    "pubkey": {"type": "string", "pattern": "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},
    "amount": {"type": "object", "required": ["mint","atomic_units"], "properties": {"mint": {"$ref": "#/$defs/pubkey"}, "atomic_units": {"$ref": "#/$defs/u64"}}, "additionalProperties": false},
    "signer": {"type": "object", "required": ["pubkey","role"], "properties": {"pubkey": {"$ref": "#/$defs/pubkey"}, "role": {"enum": ["agent_intent","paymaster_fee_payer","external"]}}, "additionalProperties": false},
    "instruction": {"type": "object", "required": ["ordinal","program_id","data_hash","account_indices","classifier"], "properties": {"ordinal": {"type": "integer", "minimum": 0}, "program_id": {"$ref": "#/$defs/pubkey"}, "data_hash": {"$ref": "#/$defs/hash"}, "account_indices": {"type": "array", "items": {"type": "integer", "minimum": 0}}, "classifier": {"enum": ["compute_budget","dontfront","paymaster_begin","flash_borrow","route","flash_repay","paymaster_finalize","distribute","treasury_settle","jito_tip"]}}, "additionalProperties": false},
    "accountMeta": {"type": "object", "required": ["pubkey","is_signer","is_writable","owner_program"], "properties": {"pubkey": {"$ref": "#/$defs/pubkey"}, "is_signer": {"type": "boolean"}, "is_writable": {"type": "boolean"}, "owner_program": {"$ref": "#/$defs/pubkey"}}, "additionalProperties": false},
    "balance": {"type": "object", "required": ["account","mint","atomic_units"], "properties": {"account": {"$ref": "#/$defs/pubkey"}, "mint": {"$ref": "#/$defs/pubkey"}, "atomic_units": {"$ref": "#/$defs/u64"}}, "additionalProperties": false}
  }
}
```

## 6. Economics, Drift, Latency, and MEV Controls

### 6.1 Fee and tip accounting

The protocol shall separate on-chain network fee exposure from a Jito tip. The Solana base fee applies per signature and the priority fee derives from the decoded CU price and limit.[4] A Jito tip is a SOL transfer instruction; in this topology it occurs only as the final instruction of TX-3, after all settlement conditions. A rejected or unlanded atomic bundle does not execute that transfer; however, the system shall not make a blanket claim that every “failed bundle” has zero cost. It shall record submission-provider charges, on-chain transaction status, landed signatures, and actual lamport deltas. A non-bundle transaction that lands but fails can charge the fee payer even though its state changes revert.[1]

### Appendix B — Staged risk budget

The following are **MVP safety configuration defaults**, not an economic forecast. Governance shall record an explicit acceptance event before activation; the system shall reject any configuration outside the hard ceiling.

| Control | MVP active limit | Immutable hard ceiling | Circuit breaker |
|---|---:|---:|---|
| Paymaster hot-vault allocation | 10,000 USDC equivalent | 10,000 USDC equivalent until human governance changes the release tier | Disable new intents if measured vault value exceeds/violates configuration. |
| Flash-loan notional per bundle | 5,000 USDC equivalent | 5,000 USDC equivalent | Reject manifest above limit. |
| Concurrent bundles | 1 | 1 | Reject while a `Prepared` settlement exists. |
| Paymaster transaction fee + priority fee exposure per bundle | 0.010 SOL | 0.020 SOL | Reject if decoded fee cap or actual reserve exceeds threshold. |
| Jito tip per bundle | 0.005 SOL | 0.010 SOL | Reject tip above ceiling or non-current tip account. |
| Total SOL fee/tip exposure per hour | 0.050 SOL | 0.100 SOL | Pause intent admission until hour window clears and human records review. |
| Total SOL fee/tip exposure per day | 0.200 SOL | 0.500 SOL | Halt for 24 hours and require human re-enable. |
| Minimum net profit | 10 USDC equivalent after all bounds | Configuration may only increase without release-tier review | Reject non-strictly-positive net profit or valuation ambiguity. |
| Slippage cap | 50 bps | 50 bps | Reject at route construction and decoded instruction verification. |
| Sim-success/exec-failure streak | 3 | 3 | Halt for one hour; human re-enable and root-cause record required. |

### 6.2 Drift tolerance policy

The standard route ceiling is 50 bps. The gate evaluates the quote’s `otherAmountThreshold`, observed quote slot, simulation slot, current account state, decoded slippage parameters, and planned execution deadline. It computes `worst_case_net_profit` using the less favorable of the simulated output and output reduced by 50 bps, subtracting repayment obligations, fee cap, priority-fee cap, and tip cap. The gate accepts only if `worst_case_net_profit > minimum_net_profit`.

A volatility mode may tighten the cap below 50 bps only after a source-locked metric feed and outage/quality rules are implemented. The initial release shall not loosen the ceiling based on an unverified oracle or a model estimate. `max_slot_delta` starts at **2 slots** for controlled staging and must be measured/re-approved for production. Any simulation older than two slots, quote past expiry, or submission after `expiry_slot` is rejected. The operations ledger classifies each sim-success/exec-failure event as stale blockhash, state drift, route failure, CU/fee error, signer failure, relay failure, or unknown; three consecutive qualified events trigger the breaker above.

### Appendix C — Latency budget

| Component | Target | Maximum | Failure rule |
|---|---:|---:|---|
| Signal ingestion → deterministic opportunity decision | <50 ms | 100 ms | Drop stale opportunity. |
| Route retrieval and decoding | <100 ms | 200 ms | Reject expired or unclassified route. |
| Agent/paymaster remote signing, each | <50 ms | 150 ms | Abandon nonce/blockhash and rebuild; never retry blind. |
| Bundle construction, simulation, and gate | <100 ms | 200 ms | Reject if completion violates slot/deadline policy. |
| Jito auction → observed landing | <200 ms | 400 ms | Record outcome; never resubmit after expiry. |
| End-to-end | <500 ms | 1,050 ms | Do not submit late; preserve receipt and reason code. |

### 6.3 MEV and relay policy

Private Jito submission, strict slippage, byte-level binding, and `jitodontfront` are defense-in-depth controls, not proof against all ordering or information-leakage risks. Jito explicitly limits DontFront’s protection to its block engine and warns that it is not a complete guarantee.[6] TX-1 adds a read-only DontFront account in an instruction that is itself manifest-allowlisted, and it occupies bundle index 0. The gate rejects TX-2/TX-3 DontFront placements that violate the contiguous-front/signer-overlap rules.

A relay adapter becomes production-eligible only after its official documentation and integration test demonstrate: authenticated submission; exact immutable transaction forwarding; stated atomicity; privacy semantics; bundle-status API; cancellation/expiry behavior; regional routing; idempotency; and measurable failure reason codes. A Jito proxy is not counted as independent redundancy. Astralane and any equivalent third-party relay are currently **blocked** because they have not been source-pinned under this requirement.

The protocol shall maintain a global `manifest_id`/approval nonce reservation before submission. It may submit to more than one independently qualified relay only when the secondary path guarantees that duplicate delivery cannot create more than one accepted settlement: the on-chain Settlement PDA checks nonce uniqueness, the paymaster allows one active nonce, and monitoring detects all candidate bundle IDs. The required metrics are landing rate, auction rejection, `Failed`/`Invalid` status, simulation failure, execution failure, mean slot drift, actual tip paid, and duplicate delivery attempts. Landing rate below 90% over the last 100 eligible attempts creates an investigation ticket and pauses scaling; it does not by itself allege MEV extraction.

## 7. Skills, Model Routing, and Qualification

### 7.1 Skills to author

| Skill | Trigger | Required contents | Explicit exclusions |
|---|---|---|---|
| `solana-professional` | Every Rust/Anchor program modification, account review, CPI design, test, or audit. | Anchor account/PDA/signer/owner/token constraints; exact program-ID validation; checked arithmetic/error taxonomy; explicit Token/Token-2022 controls; CPI/remaining-account denylist; deterministic test and review checklist; production-code prohibited patterns. | Jupiter/Jito operational policy; model routing. |
| `shadow-account-protocol` | Any paymaster state, authority, vault, settlement, treasury, or governance change. | Invariant ledger; SettlementRecord state machine; authority matrix; 85/15 rounding; profit-delta rules; risk-budget configuration; audit events; circuit-breaker change control. | Generic Rust style; off-chain bundle parsing. |
| `shadow-execution-gate` | Route retrieval, bundle construction, simulation, signer integration, relay adapter, or Python/TypeScript composer work. | Topology; canonical manifest/schema; byte decoder; source lock; route/program allowlists; freshness/drift policy; signature receipt validation; submission/deduplication; negative fixtures. | On-chain authority model beyond required interfaces. |

Each skill will retain a shared `sources.lock` reference. It will remain under 500 lines, deferring volatile protocol addresses and IDL content to reference files. Skills shall be tested with a representative task, validated, and revised only through the standard skill-authoring workflow.

### 7.2 Model-routing directive

The following text is the project instruction to persist **only after the connector audit and benchmark decision card are approved**:

> **For all Rust and Anchor program generation, use the Hugging Face connector with the qualified Qwen Coder model and strictly apply the `solana-professional` skill. Candidate primary: `Qwen/Qwen3-Coder-480B-A35B-Instruct`; candidate low-latency/independent-review route: `Qwen/Qwen3-Coder-Next`; fallback: `Qwen/Qwen2.5-Coder-32B-Instruct`. Route deterministic Python/TypeScript composer, manifest decoder, and simulation-parser generation through the same qualified coding route. Never place an LLM in the production execution path. Route architecture, economics, Jito tip policy, and MEV threat modeling to Manus’s strongest qualified reasoning model with an independent reviewer; `meta-llama/Llama-3.1-70B-Instruct` is a compatibility fallback only if connector-accessible and license-compliant. No model may sign, set economic parameters, or submit a bundle.**

The referenced Qwen repositories exist and publish agentic coding capabilities, context information, and licenses, but those model-card claims do not prove connector accessibility, latency, secure Anchor output, or project-specific superiority.[14] [15] [16] Llama 3.1 70B has a custom license/access gate and its model card identifies a newer Llama 3.3 variant, so it is not designated current-best by default.[17]

### Appendix D — Qualification benchmark and decision rule

**Step 0 — Connector capability audit.** The owner shall enumerate the configured Hugging Face connector’s actual tools; run a harmless invocation against each candidate; record model revision, license acceptance, context limit, tool/file support, output cap, rate limit, data-retention terms, invocation latency, and failure semantics. A model discoverable on the Hub but not invokeable through the configured connector fails the audit.

The fixed, held-out test pack shall include nine tasks: (1) secure Anchor context with signer/PDA/owner/mint/token-program constraints; (2) PDA seed and authority derivation review; (3) checked `u64` arithmetic and 85/15 rounding error repair; (4) malicious `remaining_accounts` and CPI program-substitution rejection; (5) transaction-manifest byte/decode mismatch analysis; (6) stale quote/slot rejection; (7) TypeScript v0 transaction serialization and ALT resolution review; (8) Rust compiler-error repair; and (9) a route-safety threat-model review. Prompts, repositories, tool access, generation parameters, and three trial seeds per candidate shall be locked before testing.

| Qualification dimension | Threshold | Hard disqualifier |
|---|---:|---|
| Connector behavior | Candidate actually invokes at pinned revision. | Discovery-only provider; unpinned revision; noncompliant data handling. |
| Latency | 4K-token answer completes within 30 seconds in three of three trials. | Any trial breaches maximum without an explicitly documented retry policy. |
| Code correctness | ≥90% compilation/test pass over deterministic tasks. | Any unresolvable test failure in a security-critical task. |
| Security | 100% rejection/explanation of negative tests. | Unsafe authority, unchecked privileged account/program, arbitrary remaining account, caller-provided profit, fabricated citation, or instruction injection. |
| Review quality | Independent reviewer finds no unresolved critical/high defect in accepted answers. | Producer and reviewer are same model with no deterministic test evidence. |
| Operational fit | Meets token/cost and context requirements after audit. | Output cannot be retained/reproduced under policy. |

A candidate must satisfy every hard gate. The selection record shall include prompts, revisions, measured results, reviewer issues, failures, and re-evaluation triggers: material model revision, connector change, Anchor/Solana/Jupiter/Jito release, security incident, or 90-day interval. Until that record exists, “qualified Qwen Coder model” is a policy placeholder, not a factual selection.

## 8. Three-Engineer Delivery Backlog

| Phase | Engineer A — On-chain security | Engineer B — Composer/gate | Engineer C — Infra, verification, and model policy | Exit condition |
|---|---|---|---|---|
| 0. Evidence and spikes | Pin Jupiter IDL/program/binary evidence; prototype account graph under `[SPIKE-EXPENDABLE]`. | Prototype transaction decoding and exact-byte manifest reconstruction under fixtures. | Connector capability audit; source lock; signer-provider golden vectors. | ADRs approved; all unknown interfaces marked blocked or pinned. |
| 1. Safety foundation | Implement state machine and account constraints in local-only branch. | Implement schema, canonicalizer, decoder, allowlist, nonce ledger, receipt verifier. | Implement source-lock CI and benchmark harness. | Unit and negative tests pass; no mainnet keys. |
| 2. Controlled integration | Implement token delta and settlement events with checked arithmetic. | Integrate raw Jupiter instruction parsing and current IDL only; simulate fixture bundle. | Integrate qualified remote signer mock and telemetry. | TX-1 borrow/route/repay test proves same-transaction ordering. |
| 3. Adversarial test | Fuzz PDAs, authority confusion, mint/token program substitution, duplicate settlement, rounding. | Fuzz manifest mutation, ALTs, fee/tip escalation, quote drift, replay, duplicate relay delivery. | Run model benchmark and independent review; validate breaker drills. | No critical/high finding unresolved; test matrix complete. |
| 4. Staged non-production | Local/test validator only; governance config dry runs. | Private submission adapter against non-production fixtures with status monitor. | Signer latency measurements and observability dashboards. | Explicit human promotion decision; no capital movement by this plan. |

### 8.1 Exploratory spike policy

Exploratory code is allowed only when it is labelled `[SPIKE-EXPENDABLE]`, isolated in its own branch/directory, linked to one ADR question, and executed with fixtures, mock keys, and local/test-validator environments. It shall not use production credentials, mainnet funds, real treasury addresses, or agent/paymaster keys. A spike is deleted or rewritten after ADR acceptance; its only durable output is a reproducible test and an ADR finding. Production signing, submission, and parameter-setting code shall not begin until the relevant source lock, ADR, skill, and negative tests are approved.

## 9. Verification Matrix and Promotion Gates

| Layer | Mandatory evidence |
|---|---|
| Schema and canonicalization | Valid JSON Schema fixtures; canonical-hash determinism; invalid field/format/nonce tests. |
| Byte decoder | Parsed serialized bytes equal manifest in order and permissions; changed program, meta, ALT, amount, compute, blockhash, or tip rejected. |
| Anchor program | Account/PDA/mint/authority/token-program tests; state transition tests; checked math/rounding tests; repeated settlement and owner-confusion tests. |
| Flash-loan composition | Valid pinned borrow/route/repay sequence accepts; split repayment, dynamic setup, stale quote, unknown route, or fee mismatch rejects. |
| Remote signing | Exact-message signature verifies; mutation/timeout/ambiguous receipt/expired request/duplicate idempotency rejects. |
| MEV/relay | DontFront placement validated; bundle-status reconciliation; duplicate-delivery nonce protection; landing/failure telemetry. |
| Circuit breakers | Per-trade/hour/day caps and three-event breaker tests; human re-enable requires recorded reason and new configuration hash. |

No release may promote if an invariant test is skipped, a source lock is stale/blocked, the primary coding model is unqualified, a high/critical security finding is unresolved, or an operator cannot reproduce the complete approval trail from intent through manifest, simulation receipt, signatures, bundle status, and settlement event.

## Appendix E — `sources.lock.json` Template

```json
{
  "lock_version": "1.0",
  "generated_at_utc": "RFC3339",
  "entries": [
    {
      "source_name": "Jupiter Lend Flashloans",
      "tier": "A",
      "url": "https://dev.jup.ag/docs/lend/flashloan",
      "retrieved_at_utc": "RFC3339",
      "product_or_program": "Jupiter Flashloan",
      "version_or_commit": null,
      "verified_program_id": "jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS",
      "verified_idl_hash": null,
      "claim_ids": ["ARCH-002"],
      "verification_status": "verified",
      "implementation_gate": "Pin target/idl commit and sha256 before composition."
    }
  ]
}
```

## Appendix F — Authority Matrix

| Role | May do | May not do |
|---|---|---|
| AI agent | Propose bounded intent; request its own remote signature after gate policy validation. | Hold SOL; fee-pay; control vaults; set parameters; submit transactions/bundles. |
| Composer | Build/decode deterministic bytes and calculate manifest. | Authorize itself; sign; mutate after approval; submit direct unapproved payload. |
| Paymaster gate | Validate, simulate, compute exposure, request signatures, and dispatch approved bytes. | Treat simulation as proof; accept unparsed client fields; bypass expiry or caps. |
| Paymaster program PDA | Enforce state, balances, destinations, and distribution. | Trust caller-supplied profit/destination; execute arbitrary CPI. |
| Governance | Change source-pinned allowlists and hard-bound configuration under recorded controls. | Directly bypass invariant checks. |
| Human approver | Approve release tier and re-enable breakers. | Delegate final production authority to a model. |

## References

[1]: [Solana, *Transactions*](https://solana.com/docs/core/transactions)
[2]: [Jito Labs, *Low Latency Transaction Send*](https://docs.jito.wtf/lowlatencytxnsend/)
[3]: [Jupiter, *Flashloans*](https://dev.jup.ag/docs/lend/flashloan)
[4]: [Solana, *Fees*](https://solana.com/docs/core/fees)
[5]: [Solana, *Transaction Structure*](https://solana.com/docs/core/transactions/transaction-structure)
[6]: [Solana, *MEV Protection with Jito DontFront*](https://solana.com/docs/defi/mev-protection)
[7]: [Jupiter, *Lend Program Addresses*](https://dev.jup.ag/docs/lend/program-addresses)
[8]: [Jupiter, *Swap Overview*](https://developers.jup.ag/docs/swap); [Jupiter, *Swap Instructions API*](https://developers.jup.ag/docs/api-reference/swap/v1/swap-instructions)
[9]: [Anchor, *Account Constraints*](https://www.anchor-lang.com/docs/references/account-constraints)
[10]: [Anchor, *Program Structure*](https://www.anchor-lang.com/docs/basics/program-structure)
[11]: [AWS KMS, *Key Spec Reference*](https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html); [AWS KMS, *Sign API*](https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html)
[12]: [Turnkey, *Solana (SVM) Support*](https://docs.turnkey.com/features/networks/solana)
[13]: [Coinbase Developer Platform, *Agentic Wallet CLI*](https://docs.cdp.coinbase.com/agentic-wallet/cli/welcome)
[14]: [Qwen, *Qwen3-Coder-480B-A35B-Instruct model card*](https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct)
[15]: [Qwen, *Qwen3-Coder-Next model card*](https://huggingface.co/Qwen/Qwen3-Coder-Next)
[16]: [Qwen, *Qwen2.5-Coder-32B-Instruct model card*](https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct)
[17]: [Meta, *Llama-3.1-70B-Instruct model card*](https://huggingface.co/meta-llama/Llama-3.1-70B-Instruct)
