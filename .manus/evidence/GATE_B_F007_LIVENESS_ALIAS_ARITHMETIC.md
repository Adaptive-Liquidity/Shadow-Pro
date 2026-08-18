# Gate B — F-007 Settlement Liveness, Alias, Arithmetic, and Transfer Hardening

**Candidate base:** `c7de7365957c2dd69c09b0d7adb73eac3793f0ff`
**Scope:** F-007 only — prevent configured-vault destination aliasing, prohibit post-expiry payout transitions, use safe BPS intermediates, and enforce mint-checked SPL transfers.
**Execution authority:** None. The protocol remains local-only; no source lock, signer, relay, deployment, funding, or public-network action is enabled.

## Security decisions

| Topic | Decision | Rationale |
|---|---|---|
| Settlement liveness | `prepare`, `finalize`, `distribute_paymaster`, and `settle_treasury` all require `current_slot < expiry_slot`. | The protected three-transaction sequence must complete within the bounded validity window. A post-expiry payout attempt fails rather than making an expired settlement payable. A failed protected bundle reverts atomically. |
| Permissionless payouts | Retained. | No agent signer was added to distribution or treasury settlement. This preserves the existing liveness model and zero-capital agent boundary. |
| Vault-destination aliasing | Rejected at configuration initialization. | Neither configured destination may equal the protocol profit vault; the two destinations must also differ from one another. |
| BPS arithmetic | Paymaster share uses checked `u128` multiplication/division and checked conversion back to `u64`. Treasury remains the exact checked remainder. | Avoids a `u64` multiplication overflow for an otherwise representable eligible profit. |
| Token transfer | Changed to SPL Token `transfer_checked` using the already validated configured mint and its decimals. | Binds the CPI to the known mint metadata rather than relying on a raw amount-only transfer. |

## Account and CPI validation matrix

| Surface | Validation after change | Result |
|---|---|---|
| Configuration initialization | Valid nondefault agent; fixed mint/vault; distinct paymaster and treasury destinations; neither destination aliases the vault. | Rejects initial misconfiguration that could route vault funds to the vault itself. |
| Prepared settlement | Canonical vault/mint/PDA; expiry must be in the future; pre-balance and minimum-profit checks. | Retained. |
| Finalization | Canonical vault/mint/PDA; configured-vault binding; unpaused; `Prepared` state; non-expired. | Retained and strengthened by F-001. |
| Paymaster distribution | Canonical vault/mint/PDA/destination; unpaused; `Finalized` state; non-expired; checked mint-aware transfer. | Strengthened. |
| Treasury settlement | Canonical vault/mint/PDA/destination; unpaused; `Distributed` state; non-expired; checked mint-aware transfer. | Strengthened. |

## Deterministic tests

| Test | Assertion |
|---|---|
| `initialization_rejects_vault_destination_alias` | A destination equal to the profit vault returns `VaultDestinationAlias`. |
| `initialization_rejects_duplicate_destinations` | Equal paymaster and treasury destinations return `DuplicateDestinations`. |
| `settlement_expiry_rejects_current_or_past_slot` | Current or past slot returns `Expired`; an earlier slot is accepted. |
| `profit_split_handles_maximum_u64_eligible_profit` | BPS computation at `u64::MAX` returns shares whose checked sum equals the eligible profit. |
| Existing F-001 and arithmetic tests | Continue to pass. |

`cargo fmt --all`, `cargo test -p shadow_paymaster`, and `cargo check -p shadow_paymaster` passed locally. The compiler emitted the existing four Anchor macro `unexpected_cfgs` warnings; no new warnings were introduced by this change.

## Known limitation

These are Rust unit and compile tests. A future local-validator/account-context integration test must still prove the declarative Anchor account constraints reject malicious transaction accounts before handler entry. No mock replacement, devnet deployment, token creation, funding, or transaction submission is part of this evidence.

## Remaining Gate B work

The test-only program-ID lifecycle and F-010 identity-governance decision remain intentionally deferred. Gate B is not complete until the remaining on-chain findings are source-verified, remediated as appropriate, and owner-signed at the resulting immutable candidate.
