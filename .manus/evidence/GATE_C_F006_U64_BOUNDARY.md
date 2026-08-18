# Gate C — F-006 Canonical u64 Atomic-Unit Boundary

**Candidate base:** `117373fe92743d742d3a0d3d668cc71f58f96fdd`
**Scope:** Enforce the actual unsigned 64-bit maximum in canonical decimal atomic-unit parsing.
**Execution authority:** None. This is pure parsing and deterministic test coverage; it does not compose, sign, simulate, submit, or fund a transaction.

## Changed parser contract

The parser already required a canonical unsigned base-10 string with at most 20 digits. It now also rejects values greater than `18,446,744,073,709,551,615` (`u64::MAX`). This closes the gap where a 20-digit value could pass the lexical check but exceed Solana-compatible atomic-unit bounds.

## Regression coverage

| Input | Result |
|---|---|
| `18446744073709551615` | Accepts as `u64::MAX`. |
| `18446744073709551616` | Rejects with an explicit maximum-u64 error. |
| Noncanonical, negative, and overlong values | Remain rejected by the existing base-10 u64 lexical check. |

The TypeScript build and full composer suite passed: 6 test files and 48 tests.
