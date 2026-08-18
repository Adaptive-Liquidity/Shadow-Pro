# Gate B — F-001 Configured-Vault Binding Remediation

**Candidate base:** `f757ae6f14cdf7e7cc2213855a71768885a7a192`
**Scope:** F-001 only — prevent `FinalizeSettlement` from accepting a substitute same-mint vault.
**Execution authority:** None. This change does not enable the source lock, deployment, funding, signing, submission, Jupiter, Jito, or a remote signer.

## Changed invariant

`FinalizeSettlement` must measure profit only from the token-account key stored in `PaymasterConfig.profit_vault`. A same-mint token account controlled by the same vault PDA is not an acceptable substitute.

## Account-validation matrix

| Account | Existing validation | Added validation | Security effect |
|---|---|---|---|
| `config` | `has_one = agent`; unpaused constraint in handler | None | Binds the authorized agent and protocol configuration. |
| `agent` | `Signer` | None | Preserves zero-capital signing authority model; no fee-payer role is added. |
| `vault_authority` | PDA seeds and configured bump | None | Restricts vault authority to the configuration-derived PDA. |
| `settlement` | mutable; `has_one = config`; agent equality | None | Binds the lifecycle record to the configuration and agent. |
| `profit_mint` | `address = config.profit_mint` | None | Prevents mint substitution. |
| `profit_vault` | Token mint, authority, and token program | `address = config.profit_vault @ ShadowError::UnexpectedVault` plus runtime key assertion | Prevents same-mint/PDA-authority vault substitution before profit arithmetic. |
| `token_program` | Typed classic SPL Token program | None | Prevents arbitrary token-program substitution. |

## Defense in depth

The declarative Anchor `address` constraint rejects a mismatched vault during account validation. The handler also calls `validate_configured_profit_vault` before any settlement arithmetic. The duplicate check is intentional: it gives the internal unit test a deterministic rejection path and ensures any future account-context refactor still preserves the fixed-vault invariant.

## Arithmetic and transition behavior

This change does not alter settlement arithmetic, BPS rounding, state transitions, destination binding, or CPI behavior. The existing `Prepared → Finalized` requirement, expiry check, paused check, and checked arithmetic remain unchanged.

## Deterministic validation

| Command | Result |
|---|---|
| `cargo fmt --all` | Passed. |
| `cargo test -p shadow_paymaster` | Passed: 7 tests, including substitute-vault rejection and canonical-vault acceptance. |
| `cargo check -p shadow_paymaster` | Passed with four existing Anchor macro `unexpected_cfgs` warnings. |

The unit regression uses distinct generated public keys and asserts that a substituted key returns the `UnexpectedVault` error path. It is not a public-network or local-validator transaction test; the Anchor account constraint is compiled but a full instruction-account integration test remains a later assurance item.

## Source-lock posture

The only relevant source-lock entry is `shadow-paymaster-program`, which remains `local-only` with no generated IDL hash and no deployment approval. The blocked Jupiter and Jito entries were neither read for execution nor changed.

## Remaining Gate B work

F-007 (expiry/liveness decision, destination/vault aliasing assessment, `u128` intermediate arithmetic, token transfer semantics, and treasury-BPS reconciliation) remains open. No claim is made that Gate B is complete from this F-001 remediation alone.
