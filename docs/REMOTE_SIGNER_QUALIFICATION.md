# Remote Signer Qualification Protocol

**Status:** Evaluation design only. No provider account, API credential, key, or signing request has been created.

## Non-negotiable signer contract

The paymaster signer accepts only exact serialized Solana message bytes bound to an unexpired canonical manifest. It returns a receipt containing request ID, idempotency key, signer public key, message SHA-256, signature, expiry, and provider audit reference. The composer verifies the Ed25519 signature locally before admitting a bundle. The signer must not create accounts, modify blockhashes, set compute/priority fees, replace payer/destination accounts, broadcast a transaction, or retry a request ambiguously.

| Candidate class | Evidence observed | Design risk | Current decision |
|---|---|---|---|
| Turnkey remote Solana signer | Turnkey documents Solana address derivation and a `TurnkeySigner`; its transaction-management product can also autofill blockhash, compute settings, fees, broadcast, and status. | Any auto-fill or managed broadcast would mutate approval bytes or exceed signer scope. The qualification path must use an exact-byte signing-only activity and disable transaction management/sponsorship. | Candidate; unselected. |
| AWS KMS Ed25519 | AWS documents asymmetric `SIGN_VERIFY` keys and Ed25519 support with private keys remaining in KMS. | A Solana-compatible adapter must prove raw-message signing, correct Ed25519 signature encoding, local verification, caller restrictions, and acceptable latency. | Candidate; unselected. |

## Required golden vectors

| Vector | Expected result |
|---|---|
| Valid exact serialized message | One signature whose local Ed25519 verification succeeds against the expected pubkey. |
| One-byte message mutation | Local message-hash check fails before signature acceptance. |
| Wrong public key | Receipt rejected. |
| Wrong request ID or idempotency key | Receipt rejected and no retry occurs. |
| Expired request or manifest | Receipt rejected. |
| Provider-mutated blockhash, payer, compute budget, destination, ALT, or instruction data | Exact-message comparison rejects it. |
| Duplicate provider response | Idempotency conflict; opportunity abandoned. |
| Timeout / uncertain provider result | No blind retry; query once by idempotency key then abandon if no unique matching receipt. |
| Invalid signature encoding | Local verifier rejects it. |
| Signer/policy role mismatch | Receipt rejected. |

## Measurement and selection protocol

For each candidate, use a non-production tenant and synthetic messages only after an explicit provider-connection approval. Run at least 100 valid requests plus the negative vectors above. Record p50/p95/p99 end-to-end signing latency, request/response size, rate-limit behavior, regional availability, audit-log fidelity, authentication model, key export controls, policy controls, outage behavior, support/SLA evidence, and cost. The selected signer must satisfy the exact-byte contract for 100% of valid/negative vectors and remain within a human-approved latency budget.

> The agent’s balance remains exactly zero. The future paymaster signer is a separate fee-paying authority, not the agent, and this document does not authorize funding it.

## References

[1]: https://docs.turnkey.com/features/networks/solana "Turnkey Solana Support"
[2]: https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html "AWS KMS Cryptography Essentials"
[3]: https://solana.com/docs/tools/kora/operators/signers "Solana Kora Signers"
