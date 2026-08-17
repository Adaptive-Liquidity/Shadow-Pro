# Jito Bundle and DontFront Review — Evidence Draft

**Status:** Evidence collected; Jito source lock remains **blocked**.  
**Retrieved:** 2026-08-16.  
**No authenticated endpoint, request, bundle submission, or tip transfer has been used.**

## First-party findings

| Area | Verified observation | Design implication |
|---|---|---|
| Bundle boundary | Jito documents bundles as up to five transactions executed sequentially, atomically, and within the same slot. | The protocol’s three-transaction bundle is within the documented maximum, but the flash borrow/route/payback remains required inside TX-1. |
| Submission acknowledgement | `sendBundle` returns a bundle ID when received but does not guarantee processing or landing. | An acknowledgement must never be treated as settlement evidence. |
| Status | `getBundleStatuses` reports processed/finalized-style status records; `getInflightBundleStatuses` exposes `Pending`, `Failed`, `Landed`, or `Invalid` in a five-minute lookback. | The relay adapter must preserve `unknown`/ambiguous status and halt rather than blindly retry. |
| Tips | Jito documents `getTipAccounts`; tip is required for consideration; official docs state a minimum 1000-lamport bundle tip. | Fetch and validate the tip-account set at admission time; cap it in the manifest. Do not hardcode a static recipient in production. |
| DontFront | A read-only, non-signer account whose pubkey starts with `jitodontfront` makes a bundle reject if that transaction is not at index 0. | TX-1 must include the marker as read-only/non-signer and be first. |
| Scope limit | Solana documents DontFront as mainnet/testnet Block Engine functionality, not devnet/localhost protection. | Local harness must emulate policy; it cannot claim actual Jito ordering protection. |
| Encoding | Jito recommends base64 and deprecates base58. | Relay wire format must use base64 only. |

## Required controls before a relay pin

1. Capture the exact selected Jito environment URL, region/routing rationale, authentication method, and retrieval date in `sources.lock.json`.
2. Implement a fake relay first; test acknowledgement, `Pending`, `Failed`, `Landed`, `Invalid`, null/not-found, retryable status error, timeout, duplicate response, and expiry.
3. Enforce exactly three signed transactions; require TX-1 DontFront marker at index zero; require TX-3 final instruction to be the bounded tip transfer.
4. Fetch tip accounts only from the pinned source, validate membership and read-only account semantics, and record the set hash in the manifest/simulation receipt.
5. Require local chain-signature and settlement-event reconciliation after any external test submission. `bundle_id` alone is never sufficient.
6. Keep the Jito lock blocked until source snapshots, adapter tests, and independent review agree.

## References

[1]: https://docs.jito.wtf/lowlatencytxnsend/ "Jito Low Latency Transaction Send"
[2]: https://solana.com/docs/defi/mev-protection "Solana MEV Protection with Jito DontFront"
[3]: https://solana.com/developers/cookbook/transactions/mev-protection "Solana Cookbook: Jito MEV Protection"
