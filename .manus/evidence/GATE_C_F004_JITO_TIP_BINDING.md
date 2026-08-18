# Gate C — F-004 Decoded Jito Tip Binding and Cap Enforcement

**Candidate base:** `ac5245d5ca2ae518a7267b30ca61a3698fc95e7c`
**Scope:** Bind the final TX-3 Jito tip to an independently decoded canonical System Program transfer rather than accepting a classifier and declared tip account alone.
**Execution authority:** None. This validates local decoded fixtures only; it does not query Jito, retrieve live tip accounts, or submit a bundle.

## Enforced transfer contract

The TX-3 final instruction must be a System Program transfer with:

1. exactly two referenced account metas;
2. canonical 12-byte transfer data (`u32` System transfer discriminator `2` plus a little-endian `u64` lamport amount);
3. a nonzero decoded amount at or below `manifest.risk.maxTipLamports`;
4. the source meta equal to the paymaster fee payer, signer, writable, and System-owned; and
5. the recipient meta equal to the manifest tip account, nonsigner, writable, System-owned, and already in the verified current tip-account set.

The canonical TX-3 classifier sequence remains exactly `treasury_settle → jito_tip`.

## Deterministic regression coverage

| Test | Result |
|---|---|
| Canonical System transfer to verified tip account | Admits. |
| Decoded amount above manifest tip cap | Rejects with `JITO_TIP_CAP_EXCEEDED`. |
| Recipient account substitution | Rejects with `JITO_TIP_BINDING_INVALID`. |
| Tip not final in TX-3 | Rejects with `INSTRUCTION_TOPOLOGY_INVALID`. |
| Local harness canonical transfer | Continues to admit and preserves zero-agent-SOL invariant. |

The TypeScript build and full composer suite passed: 6 test files and 47 tests.

## Retained boundary

This validates the decoded transfer only. The current tip-account set remains a policy input that must be independently fetched and pinned in a later Jito qualification gate. Live Jito endpoints, DontFront account semantics, provider status, and bundle submission remain blocked.
