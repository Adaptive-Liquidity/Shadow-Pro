# Gate C — F-003 Exact Canonical Bundle Topology

**Candidate base:** `ea7a9ae63aac66b3f5405a328e5ef88d3c13f447`
**Scope:** Replace presence-only protected-bundle classifier checks with exact canonical sequence and exact-once enforcement.
**Execution authority:** None. This change neither decodes live transactions nor enables source locks, signers, relays, or submission.

## Enforced sequence

| Transaction role | Required exact classifier sequence |
|---|---|
| `execute_flash_route` | `compute_budget → dontfront → paymaster_begin → flash_borrow → one-or-more route → flash_repay → paymaster_finalize` |
| `distribute_profit` | `distribute` only |
| `treasury_settle_and_tip` | `treasury_settle → jito_tip` only |

The execution transaction requires every non-route lifecycle classifier exactly once. The finalization instruction must be last; route instructions may occur only between borrow and repayment. The other two transactions reject any extra instruction, duplicate instruction, or reorder.

## Deterministic regression coverage

| Test | Result |
|---|---|
| Canonical three-transaction fixture | Admits. |
| Duplicate flash repayment | Rejects with `INSTRUCTION_TOPOLOGY_INVALID`. |
| Missing route | Rejects with `INSTRUCTION_TOPOLOGY_INVALID`. |
| Route after paymaster finalization | Rejects with `INSTRUCTION_TOPOLOGY_INVALID`. |
| Route outside TX-1 | Rejects. |
| Flash borrow/repay outside TX-1 | Rejects. |
| Unrelated settlement instruction in TX-1 | Rejects. |
| Tip not final in TX-3 | Rejects. |

The TypeScript build and full composer suite passed: 6 test files and 43 tests.

## Remaining work

This scope enforces classifier-level sequence only. Exact decoded program-data binding, account-meta binding, ALT resolution, the real DontFront account, and Jito tip transfer account/amount binding remain separate Gate C controls.
