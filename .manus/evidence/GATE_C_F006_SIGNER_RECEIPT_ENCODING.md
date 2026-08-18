# Gate C — F-006 Signer Receipt Encoding and Expiry Hardening

**Candidate base:** `b783eeb510040d569a3dfc94f4bf94a4cd934f90`
**Scope:** Normalize malformed Ed25519 receipt parsing and invalid expiry handling before signature verification.
**Execution authority:** None. This change validates local receipt vectors only; it does not connect a remote signer, create keys, request signatures, or submit transactions.

## Changed controls

| Input | Previous behavior | Hardened behavior |
|---|---|---|
| `expiresAt` | `Date.parse` could produce `NaN` and bypass the expiry comparison. | Non-finite values reject with `SIGN_RECEIPT_EXPIRY_INVALID`; expired valid values reject with `SIGN_RECEIPT_EXPIRED`. |
| Signer Base58 | Decoder exceptions could escape as library-specific errors. | Exceptions normalize to `INVALID_ED25519_RECEIPT_ENCODING`. |
| Serialized-message Base64 | Node decoding was permissive. | Standard canonical Base64 is required before exact-message hashing. |
| Signature Base64 | Node decoding was permissive. | Standard canonical Base64 is required before length and Ed25519 verification. |

## Retained bindings

The verifier still checks the expected signer role, expected message hash, nonempty exact serialized message, SHA-256 hash of the exact bytes, 32-byte Ed25519 public key length, 64-byte signature length, and local Ed25519 verification result.

## Deterministic regression coverage

| Test | Result |
|---|---|
| Valid exact-message Ed25519 signature | Passes. |
| Mutated serialized bytes | Rejects with `EXACT_MESSAGE_HASH_MISMATCH`. |
| Signer-role substitution | Rejects with `SIGNER_PUBKEY_MISMATCH`. |
| Invalid timestamp | Rejects with `SIGN_RECEIPT_EXPIRY_INVALID`. |
| Malformed Base58 signer | Rejects with `INVALID_ED25519_RECEIPT_ENCODING`. |
| Malformed Base64 message or signature | Rejects with `INVALID_ED25519_RECEIPT_ENCODING`. |

The TypeScript build and composer suite passed: 6 files and 40 tests.

## Remaining boundary

This is receipt parsing and verification only. Provider identity, mutual authentication, request expiry policy, idempotency lookup, latency qualification, and real signer activation remain separate blocked gates.
