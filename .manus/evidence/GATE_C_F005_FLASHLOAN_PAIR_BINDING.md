# Gate C — F-005 Immutable Flashloan Borrow/Payback Account Binding

**Candidate base:** `b27ae379d73e2c4808934fa14d5ff169a612bc65`
**Scope:** Require source-locked Jupiter Flashloan borrow and payback instructions to bind every decoded account to the same public key, in addition to existing order and amount checks.
**Execution authority:** None. The immutable interface remains a decoder fixture; the Jupiter source lock remains blocked and no route composition or network request occurs.

## Changed decoder contract

`DecodedFlashloanInstruction` now retains the ordered decoded `accountPubkeys` alongside its account names and amount. `validateFlashloanBorrowPaybackPair` requires:

1. exactly one borrow and one payback;
2. borrow before payback;
3. identical decoded atomic amount; and
4. an equal public key at every immutable-IDL account index.

The fixed associated-token program, system program, and instruction-sysvar addresses remain independently validated for each instruction before pair comparison.

## Adversarial regression coverage

| Mutation | Expected result |
|---|---|
| Borrower signer substitution | `FLASH_PAIR_ACCOUNT_MISMATCH` |
| Borrower token-account substitution | `FLASH_PAIR_ACCOUNT_MISMATCH` |
| Mint substitution | `FLASH_PAIR_ACCOUNT_MISMATCH` |
| Reserve-liquidity substitution | `FLASH_PAIR_ACCOUNT_MISMATCH` |
| Vault substitution | `FLASH_PAIR_ACCOUNT_MISMATCH` |
| Missing, duplicate, reordered, or amount-mismatched pair | Existing explicit pair error codes remain enforced. |

The TypeScript build and full composer suite passed: 6 test files and 44 tests.

## Retained boundary

This validates the immutable two-instruction Flashloan pair only. Real versioned-message decoding, ALT resolution, route account-map validation, and public Jupiter availability remain separate evidence gates. The current source lock continues to deny execution.
