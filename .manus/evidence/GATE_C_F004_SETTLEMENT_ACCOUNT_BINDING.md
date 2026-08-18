# Gate C — F-004 Decoded Distribution and Treasury Account Binding

**Candidate base:** `7714f44166cd9b2bec863bb1c1bf7ace7537c62f`
**Scope:** Bind decoded `distribute_paymaster` and `settle_treasury` instructions to the fixed seven-account Shadow Paymaster contexts defined by the reviewed Anchor program.
**Execution authority:** None. This is manifest-admission validation against local decoded fixtures; it does not create, sign, or submit a transaction.

## Enforced fixed account order

For both distribution and treasury settlement, the first instruction must invoke the source-locked Paymaster program and reference exactly these decoded account positions:

| Index | Required binding |
|---:|---|
| 0 | Source-locked Paymaster config account |
| 1 | Derived vault-authority PDA |
| 2 | Manifest settlement PDA, writable, Paymaster-owned |
| 3 | Source-locked profit mint |
| 4 | Source-locked profit vault, writable |
| 5 | Fixed paymaster or treasury destination, writable |
| 6 | Source-locked SPL Token Program |

The policy contains these source-derived bindings; manifest-declared settlement destination fields do not replace the decoded account checks.

## Deterministic regression coverage

| Mutation | Result |
|---|---|
| Canonical distribute and settle contexts | Admit. |
| Paymaster distribution destination substitution | Rejects with `SETTLEMENT_ACCOUNT_BINDING_INVALID`. |
| Treasury settlement account-index reordering | Rejects with `SETTLEMENT_ACCOUNT_BINDING_INVALID`. |
| Wrong settlement program | Rejects with `SETTLEMENT_PROGRAM_BINDING_INVALID`. |
| Local harness | Continues to admit only the canonical context while preserving zero agent SOL. |

The TypeScript build and full composer suite passed: 6 test files and 50 tests.

## Retained boundary

The bindings are tested against decoded fixtures derived from the reviewed current Anchor account contexts. Real versioned-transaction decoding, ALT resolution, Anchor discriminator validation, and a deployed Paymaster program remain separate evidence gates.
