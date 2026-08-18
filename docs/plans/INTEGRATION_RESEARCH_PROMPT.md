# Shadow Account Protocol — Jupiter, Jito, and Public-Test Integration Research Prompt

```text
You are a senior Solana protocol-integration researcher and security engineer. Research the unresolved real-integration testing path for the Shadow Account Protocol. Your answer must be evidence-led, technically precise, and safe for an adversarial DeFi/MEV environment.

## Objective

Determine exactly how—if at all—we can test the full real integration path for:

1. Jupiter Flashloan: borrow → allowlisted route → repay in one atomic Solana transaction.
2. A protected three-transaction Jito bundle:
   - TX-1: compute budget → read-only DontFront → paymaster prepare → flash borrow → route → flash repay → paymaster finalize.
   - TX-2: distribute fixed paymaster share.
   - TX-3: settle fixed treasury share → final bounded Jito tip.
3. A remote paymaster signer that signs only exact, already-validated transaction bytes.
4. All safety controls on devnet and/or testnet before any mainnet consideration.

Do not propose mocks, fake programs, local substitutes, mainnet transactions, live capital, wallet funding, signer activation, bundle submission, or deployment as the answer. The project preference is to test against real integrations on non-production networks only. If a required dependency is unavailable on a non-production cluster, state that plainly and identify the exact hard block.

## Verified starting facts

- The protocol must preserve a zero-SOL agent intent authority. The agent cannot be a fee payer, vault owner, rent payer, treasury owner, unrestricted transfer authority, or transaction submitter.
- The protected execution unit is exactly three ordered Jito transactions; no account creation, ATA setup, rent funding, or maintenance instruction may enter the protected bundle.
- Jupiter’s official Flashloan program address documentation currently lists `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS` for mainnet. A read-only `getAccountInfo` call for this address on `https://api.devnet.solana.com` returned `value: null` at slot `484635078`.
- Jupiter’s official Flashloan docs show a one-transaction `borrow → custom logic → payback` flow and use a mainnet RPC example.
- Jito’s published Block Engine endpoint table lists mainnet and testnet endpoints, but not devnet endpoints.
- The project has captured a Jupiter Flashloan IDL from immutable commit `33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9`, SHA-256 `7fac42ff8320d70162f81c610cb985418a11ed8d40f09a0b2cc3809fc25ef4be`; this does not itself authorize integration.
- Existing application code is intentionally fail-closed. No production endpoint, signer, relay, source lock, program deployment, funding, or transaction submission is enabled.

## Required research questions

### A. Jupiter Flashloan cluster availability

1. Does Jupiter officially deploy a real Flashloan program on Solana **testnet**? If yes, provide:
   - Exact program ID.
   - Official source URL.
   - Cluster name.
   - Immutable IDL URL and commit/tag.
   - SHA-256 of exact raw IDL bytes.
   - Required dependent program IDs, liquidity accounts, token mints, token program, lookup tables, and any rate-model/vault accounts.
   - Whether usable test liquidity exists and how it is funded or provisioned without user capital.
2. If Jupiter Flashloan does not officially support testnet, identify the authoritative proof. Distinguish clearly between:
   - not documented;
   - not deployed;
   - deployed but unusable due to no liquidity;
   - available only to a private/permissioned environment.
3. Is there any Jupiter-supported non-mainnet environment other than public devnet/testnet? Do not infer this from third-party blogs; require first-party evidence.
4. Explain whether the same mainnet program ID can ever be expected on devnet/testnet. Validate with on-chain `getAccountInfo`, not assumptions.

### B. Real Jito non-production integration

1. Identify Jito’s currently supported **testnet** Block Engine URLs, transport options, authentication requirements, bundle limits, status endpoints, and `getTipAccounts` behavior from first-party docs.
2. Confirm whether Jito supports devnet bundle submission or DontFront enforcement. If not, state that Jito MEV/bundle behavior cannot be meaningfully tested on devnet.
3. Define how to test, without submitting a live bundle yet:
   - endpoint reachability;
   - response schema validation;
   - current tip-account retrieval and freshness;
   - bundle-status parsing;
   - acknowledgement-versus-landing distinction;
   - DontFront account construction and first-bundle-index rule;
   - terminal status reconciliation.
4. Define the minimal safe real testnet bundle experiment only if all dependencies are supported there. It must use isolated test-only credentials/assets, bounded fee/tip, no mainnet wallet, no production configuration, and separate approval before submission.

### C. Exact transaction, signer, and simulation requirements

1. Specify the exact integration flow for constructing and independently decoding versioned transactions and Address Lookup Tables:
   - retrieve every account and ALT at a pinned slot;
   - assemble exact compiled instructions;
   - independently decode instruction data and account metas;
   - compare decoded values to the canonical manifest;
   - simulate all three transactions/bundle against the same state context where possible;
   - calculate worst-case net profit after all fees, tip, flash obligation, slippage, and margin;
   - request a remote signature only for exact serialized message bytes;
   - locally verify Ed25519 signatures before any relay interaction.
2. Describe the correct non-production remote-signer qualification process for a provider such as Turnkey or AWS KMS. Include exact-byte Ed25519 compatibility, test identity constraints, golden vectors, idempotency, expiry, timeout handling, audit logs, and p50/p95/p99 latency measurement. Do not create a key or connect a provider.
3. Explain how to preserve the zero-SOL agent invariant in a real test environment. State precisely which test-only actor pays network fees and why this does not grant the agent capital or transfer authority.

### D. Decision framework and no-go conditions

Give a decision tree with one of the following outcomes:

- **Path 1 — Full real testnet integration is supported:** list the exact evidence, configuration values, read-only verification steps, and the approvals needed before a controlled submission.
- **Path 2 — Partial non-production testing only:** identify which components can be verified on devnet/testnet, which cannot, and how to prevent a false end-to-end claim.
- **Path 3 — No viable public non-production path:** identify the first-party-supported alternative, if any. If none exists, state that mainnet must remain blocked rather than proposing live testing.

Stop and declare a hard block immediately on any of the following: a missing or unpinned program ID; a non-immutable IDL; unverified liquidity; missing ALT/account relation; incompatible token program or extension; an unsupported cluster; missing bundle endpoint; signer byte mutation; nonzero agent SOL; unknown status semantics; no independent code review; or any requirement to use a user wallet, production key, or mainnet capital.

## Evidence standards

- Use first-party Jupiter, Jito, Solana, and provider documentation first. Then corroborate actual cluster deployment with read-only RPC calls.
- Provide direct URLs, retrieval date, cluster, program IDs, account data or null result, immutable commit/tag, SHA-256, and exact commands for every material claim.
- Do not rely on search snippets, marketing pages, cached third-party guides, code examples that assume mainnet, or undocumented endpoint variants.
- Clearly label every item as **verified**, **unverified**, **unsupported**, or **blocked**.
- Separate factual observations from recommendations.
- Never print secrets, private keys, signed transaction bytes, API keys, funded-wallet information, or real user identities.

## Deliverable format

Produce the following sections:

1. Executive conclusion: can the full real workflow be tested on devnet, testnet, both, or neither?
2. A cluster-by-cluster table for devnet, testnet, and mainnet, covering Jupiter Flashloan, Jito bundles, DontFront, test liquidity, source-locked program/IDL availability, signer qualification, and permitted action.
3. An evidence ledger with citations and read-only verification commands.
4. A step-by-step implementation runbook, divided into read-only checks, code-only work, configuration preparation, and separately approved network actions.
5. A hard-block list and explicit no-go criteria.
6. The exact next engineering ticket(s), ordered by dependency.

The answer must not claim success merely because a program address resolves or an endpoint returns HTTP success. Success requires the exact source-locked interface, valid accounts, usable non-production liquidity, independent decoding, simulation evidence, deterministic admission checks, and the required human approvals.
```
