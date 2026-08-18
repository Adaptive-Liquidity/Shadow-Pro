# Shadow Account Protocol — Research Evidence Notes

**Retrieval date:** 2026-08-16 (user timezone).
**Scope:** Public Solana devnet/testnet feasibility only. No funds, signers, deployment, or submissions are authorized or performed.

## First-party documentation findings

### Jupiter Lend Flashloans

- Official docs describe a same-transaction flow: borrow, arbitrary custom instructions, and payback; the docs' concrete connection example uses `https://api.mainnet-beta.solana.com`.
- The published SDK interface accepts a Solana RPC `Connection`, a signer, an asset mint, and an amount. The visible public example does not establish devnet or testnet support.
- The official docs do not, in the retrieved pages, publish a non-mainnet Flashloan deployment, test liquidity, or a source-locked testnet IDL.

Sources:
- https://dev.jup.ag/docs/lend/flashloan
- https://dev.jup.ag/docs/lend/flashloan/execute
- https://github.com/jup-ag/jupiter-lend

### Jito Block Engine and DontFront

- Jito's official Block Engine documentation lists public JSON-RPC endpoints for **testnet** (`https://testnet.block-engine.jito.wtf`, plus Dallas and New York regional endpoints), as well as mainnet endpoints. It does **not** list a devnet endpoint.
- Jito documents JSON-RPC and gRPC transport, bundle limits of at most five fully signed transactions, and sequential atomic execution within a single slot.
- `sendBundle` acknowledgement with `bundle_id` confirms receipt only; Jito states it does not guarantee processing or landing. The documented reconciliation calls are `getInflightBundleStatuses` (five-minute state: Invalid/Pending/Failed/Landed) and `getBundleStatuses` (landed/processed records, subject to recent history limits).
- `getTipAccounts` returns the designated tip account list. Jito says a bundle needs a tip to be considered and documents a 1,000-lamport minimum tip.
- Jito documents UUID authentication via `x-jito-auth` header or query parameter when authentication is used.
- Solana's first-party DontFront guide states it is **mainnet/testnet only**, must go through Jito Block Engine, requires a read-only non-signer account whose pubkey begins `jitodontfront`, and requires a DontFront transaction to be at bundle index 0. Multiple DontFront transactions are allowed only when contiguous at the front and with required signer overlap. Devnet is explicitly unsupported.

Sources:
- https://docs.jito.wtf/lowlatencytxnsend/
- https://solana.com/docs/defi/mev-protection

## Status after initial documentation review

| Component | Devnet | Testnet | Current evidence status |
|---|---|---|---|
| Jupiter Flashloan | No official non-production deployment identified | No official non-production deployment identified | Unverified; requires source and RPC verification |
| Jito bundle transport | Unsupported/not published | Officially published | Verified documentation only; read-only probing remains |
| DontFront | Explicitly unsupported | Officially supported | Verified documentation only; must verify exact transaction construction in code |
| Full three-transaction workflow | Blocked by Jito and Flashloan constraints | Pending Flashloan availability/liquidity proof | Cannot claim end-to-end support |

## Next evidence actions

1. Find Jupiter's first-party program-address and IDL documentation, then verify all candidates with read-only `getAccountInfo` on testnet and devnet.
2. Perform read-only JSON-RPC probes only: `getVersion`, `getAccountInfo`, `getSlot`, and Jito `getTipAccounts`/status schema calls without transaction data.
3. Gather official Solana versioned transaction, simulation, ALT, and signature verification documentation and provider-side remote signing constraints.
4. Treat no first-party testnet Flashloan deployment plus no proven test liquidity as a hard block to a full real testnet path.

## Safety boundary

This research log contains no private keys, secrets, signed transaction bytes, live endpoint submissions, wallet identities, funded account data, or deployment instructions.


## Read-only Jupiter Flashloan deployment verification

**Method:** Public Solana JSON-RPC `getAccountInfo` with `commitment: finalized`, `encoding: base64` against the official Jupiter Flashloan program ID `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS`.
**Executed:** 2026-08-16 (user timezone); no state-changing requests, wallet use, or transaction material.

| Cluster | Endpoint | Finalized context slot | RPC account result | Status |
|---|---|---:|---|---|
| Devnet | `https://api.devnet.solana.com` | 484639258 | `value: null` | **Verified: not deployed at this program ID** |
| Testnet | `https://api.testnet.solana.com` | 429889334 | `value: null` | **Verified: not deployed at this program ID** |
| Mainnet-beta | `https://api.mainnet-beta.solana.com` | 439765127 | Executable program account; owner `BPFLoaderUpgradeab1e11111111111`; 36-byte program-state data | **Verified: deployed** |

The official first-party program-address table itself marks every listed Jupiter Lend program, including Flashloan, as **Mainnet** only. Jupiter's IDL page points to the mutable `main` branch of `jup-ag/jupiter-lend`; its present public page is not an immutable IDL artifact. This is a separate hard block from the cluster deployment result: a pinned commit plus raw-byte SHA-256 are required before integration qualification.

Authoritative sources:
- https://developers.jup.ag/docs/lend/program-addresses.md
- https://developers.jup.ag/docs/lend/idl-and-types.md

Exact verification command:
```sh
for cluster in devnet testnet mainnet-beta; do
  curl -sS --max-time 15 -X POST "https://api.$cluster.solana.com" \
    -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS",{"encoding":"base64","commitment":"finalized"}]}'
done
```


## Source-locked Flashloan IDL verification

**Verified immutable source:** `jup-ag/jupiter-lend` commit [`33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9`](https://github.com/jup-ag/jupiter-lend/tree/33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9), authored 2026-08-10T05:39:27Z.
**Exact artifact:** [`target/idl/flashloan.json`](https://raw.githubusercontent.com/jup-ag/jupiter-lend/33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9/target/idl/flashloan.json).
**Git blob:** `0d0ae6d624b33355315e98baaf0a5d00d317beb8`; **size:** 9,476 bytes.
**SHA-256 of raw retrieved bytes:** `7fac42ff8320d70162f81c610cb985418a11ed8d40f09a0b2cc3809fc25ef4be` (**matches the supplied starting fact**).

The pinned IDL declares program address `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS`, instruction pair `flashloan_borrow` / `flashloan_payback`, both accepting `amount: u64`. It requires the transaction signer and the following protocol-specific account classes: `flashloan_admin`, signer borrow token account, mint, token-reserves liquidity, flashloan borrow-position-on-liquidity, rate model, vault, liquidity, and a `liquidity_program` constrained to the admin relation. It further requires a compatible token program and the instruction sysvar; it optionally accepts the associated-token program. The fixed public IDs in the IDL are the system program (`11111111111111111111111111111111`), instructions sysvar (`Sysvar1nstructions1111111111111111111111111`), and optional Associated Token Account program (`ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`).

**Important boundary:** The IDL establishes interface shape, not cluster availability, administrator state, compatible token extensions, lookup-table relationship, account validity, or usable liquidity. Those preconditions remain unavailable on testnet because the program account itself resolves `null` there.

Exact provenance commands:
```sh
gh api 'repos/jup-ag/jupiter-lend/git/trees/33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9?recursive=1' \
  --jq '.tree[] | select(.path == "target/idl/flashloan.json") | [.path,.sha,.size] | @tsv'

gh api -H 'Accept: application/vnd.github.raw' \
  'repos/jup-ag/jupiter-lend/contents/target/idl/flashloan.json?ref=33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9' \
  > flashloan_33a22cf7.json
sha256sum flashloan_33a22cf7.json
```


## Read-only Jito testnet verification

**Endpoint probed:** `https://testnet.block-engine.jito.wtf/api/v1` (the Jito-documented global public testnet Block Engine base).
**Safety boundary:** Calls used only `getTipAccounts` and a deliberately synthetic unknown 64-hex-character bundle ID in `getInflightBundleStatuses`; no signed transaction, bundle, wallet, API key, tip, or state-changing method was supplied.

| Check | Observed result | Status |
|---|---|---|
| `getTipAccounts` | JSON-RPC result returned exactly eight Solana pubkeys | **Verified: endpoint reachable; response is an array of 8 tip accounts** |
| `getInflightBundleStatuses` for synthetic unknown ID | JSON-RPC object with `context.slot: 429889751` and `value[0] = {bundle_id, status: "Invalid", landed_slot: null}` | **Verified: documented status response shape and `Invalid` parsing** |
| `getBundleStatuses` terminal-status probe | Request intentionally had no associated submitted bundle and returned no usable record before the connection closed | **Not a success signal; rely on the documented schema until a separately approved test submission exists** |

**Live `getTipAccounts` snapshot (not a permanent configuration):**
`4uRnem4BfVpZBv7kShVxUYtcipscgZMSHi3B9CSL6gAA`, `G2d63CEgKBdgtpYT2BuheYQ9HFuFCenuHLNyKVpqAuSD`, `CwWZzvRgmxj9WLLhdoWUVrHZ1J8db3w2iptKuAitHqoC`, `7aewvu8fMf1DK4fKoMXKfs3h3wpAQ7r7D8T1C71LmMF`, `BkMx5bRzQeP6tUZgzEs3xeDWJfQiLYvNDqSgmGZKYJDq`, `AzfhMPcx3qjbvCK3UUy868qmc5L451W341cpFqdL3EBe`, `F7ThiQUBYiEcyaxpmMuUeACdoiSLKg4SZZ8JSfpFNwAf`, `84DrGKhycCUGfLzw8hXsUYX9SnWdh2wW3ozsTPrC5xyg`.

**Freshness rule:** A tip account list is discovery data, not a pinned constant. Fetch it immediately before assembling a candidate manifest; enforce result shape `array length == 8`, each entry valid base58 pubkey and duplicate-free; retain the retrieval timestamp, endpoint, and a deterministic digest of the ordered response in the admission record. A changed result requires human review before a later approved submission.

**Acknowledgement-versus-landing rule:** Per Jito documentation, `sendBundle` receipt with a `bundle_id` means the relay received the bundle, not that it processed or landed. Inflight reconciliation is valid only for five minutes. Treat `Landed` as provisional and then query `getBundleStatuses`; accept success only if the latter returns the expected three transaction signatures, expected slot, no error, and `confirmation_status: finalized`, followed by independent Solana RPC finality/account-delta verification.

Exact read-only commands:
```sh
curl -sS --max-time 15 -X POST 'https://testnet.block-engine.jito.wtf/api/v1/getTipAccounts' \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":"shadow-readonly-tip-1","method":"getTipAccounts","params":[]}'

curl -sS --max-time 15 -X POST 'https://testnet.block-engine.jito.wtf/api/v1/getInflightBundleStatuses' \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":"shadow-readonly-status-1","method":"getInflightBundleStatuses","params":[["0000000000000000000000000000000000000000000000000000000000000000"]]}'
```


## Remote signer qualification findings and required controls

### Provider capability status

| Provider route | First-party evidence | Qualification status | Required decision |
|---|---|---|---|
| Turnkey `@turnkey/solana` / `TurnkeySigner` | Turnkey states its Solana address format uses `CURVE_ED25519`; its `TurnkeySigner` integrates the remote signer with `web3.js`; its SignRawPayload endpoint accepts a hexadecimal payload with `HASH_FUNCTION_NO_OP`. | **Candidate only.** The generic raw-payload response page is not sufficient proof that this exact integration produces a Solana-compatible 64-byte detached Ed25519 signature over the unchanged serialized message bytes. | **Blocked until golden-vector qualification passes.** Do not use Turnkey transaction-management/broadcast or sponsorship features in this project. |
| AWS KMS `ECC_NIST_EDWARDS25519` | AWS documents an Ed25519 key spec for signing/verification. For Solana's normal detached Ed25519 message signature, the candidate combination is `ECC_NIST_EDWARDS25519`, `ED25519_SHA_512`, and `MessageType: RAW`; AWS documents an input limit of 4,096 bytes and allows public-key offline verification. | **Candidate only.** Exact Solana message byte size, public-key representation, and raw 64-byte signature compatibility must be proven against golden vectors and a test identity. | **Blocked until golden-vector qualification passes.** No KMS key creation, grants, provider connection, or signing is authorized by this research. |

### Mandatory qualification protocol (non-production only; no provider activation performed)

1. Use a dedicated, unfunded **test-only** identity. Record only its public key and provider key reference in a restricted test manifest; never place credentials or key material in the repository, logs, or this report.
2. Generate at least three deterministic golden vectors outside the provider: (a) a minimal valid v0 message; (b) a maximum-complexity candidate message with ALTs; and (c) a negative vector that differs by one byte. For each record message bytes, `sha256(message_bytes)`, expected public key, expected detached signature, and expected verification result. The vector corpus should contain no signed live transaction and no funded account.
3. The admission service must serialize the **message only** once, compute `message_sha256`, parse/decode it independently, bind an immutable manifest digest plus a short expiry and single-use idempotency key to that hash, and send the exact bytes to the remote signer. It must prohibit provider-side blockhash/fee/compute modification, transaction construction, broadcast, sponsorship, or replayable signing requests.
4. On response, require the same request ID/idempotency key, declared public key, declared signing algorithm/curve, exact returned payload hash, and a 64-byte detached Ed25519 signature. Reject missing/extra/mutated bytes, an incompatible algorithm, an ECDSA `(r,s,v)` response, an altered response context, a late response, duplicate response, or an expired approval.
5. Locally verify the Ed25519 signature against the expected public key and the exact serialized message bytes *before* inserting it at the corresponding transaction signature index. Re-serialize the transaction and independently decode it; `message_sha256` and canonical semantic manifest hash must still match.
6. Measure provider round-trip latency for a fixed, approved test corpus with at least 100 samples per vector across the intended operating region. Persist p50/p95/p99, timeout rate, error taxonomy, correlation IDs, provider request IDs, message hash, signer public key, policy/approval ID, and local verification outcome. Never log raw signed payloads or credentials.
7. Set an explicit, configuration-pinned signing deadline below the blockhash validity window. On timeout or any ambiguous transport response, mark the request **unknown/failed**, retire its idempotency key, discard all signatures and candidate bytes, obtain a fresh blockhash, and rebuild/re-admit from source. Never retry by sending the same message blindly; never submit if two different response states are possible.

### Solana message and simulation facts used by the runbook

- A Solana transaction is signatures plus a message; each required signature is a **64-byte Ed25519 signature of the serialized message**. The fee payer is the first signer/account and pays base and priority fees. Therefore a zero-SOL agent cannot appear as transaction fee payer.
- A v0 compiled instruction references program and account keys by index; the independent decoder must reconstruct every static and ALT-loaded address and apply header permissions before decoding account metas and instruction data.
- `getMultipleAccounts` returns a single response context slot, accepts `minContextSlot`, returns base64 account data, and yields `null` for missing accounts. Record a content hash for each account wrapper plus the raw bytes before semantic parsing.
- `simulateTransaction` does not broadcast. `sigVerify` cannot be used simultaneously with `replaceRecentBlockhash`. In strict qualification, do two modes: first an unsigned/placeholder-signature dry simulation with `replaceRecentBlockhash: true`, then a final signed simulation with `sigVerify: true`, `replaceRecentBlockhash: false`, and the exact signing blockhash. A successful simulation is necessary but not sufficient: it is a single-transaction state view and is not an attestation that a multi-transaction Jito bundle will land or that its inputs will remain unchanged.

Sources:
- https://docs.turnkey.com/features/networks/solana
- https://docs.turnkey.com/api-reference/activities/sign-raw-payload
- https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html
- https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html
- https://solana.com/docs/core/transactions/transaction-structure
- https://solana.com/docs/rpc/http/getmultipleaccounts
- https://solana.com/docs/rpc/http/simulatetransaction
