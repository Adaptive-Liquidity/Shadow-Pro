# Jupiter Flashloan Interface Review — Evidence Draft

**Status:** Evidence collected; source lock remains **blocked**.  
**Retrieved:** 2026-08-16.  
**Do not use as a route-composition authorization.**

## First-party sources

| Artifact | Source | Observed value |
|---|---|---|
| Flashloan documentation | https://dev.jup.ag/docs/lend/flashloan | Borrow, execute, and payback must occur within the exact same transaction; the documentation describes no flash-loan fee. |
| Official program-address page | https://dev.jup.ag/docs/lend/program-addresses | Mainnet flash-loan program: `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS`. |
| Official IDL location | https://github.com/jup-ag/jupiter-lend/tree/main/target/idl/flashloan.json | IDL artifact is present in Jupiter’s public target directory. |
| Main branch commit observed at retrieval | https://github.com/jup-ag/jupiter-lend/commit/33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9 | This commit is a moving-branch observation only, not yet the repository’s pinned artifact reference. |

## Interface observations from the retrieved IDL

The observed `flashloan` IDL reports program address `jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS` and metadata version `0.1.4`. It declares the `flashloan_borrow` and `flashloan_payback` instructions, each taking a `u64 amount` and the same ordered account family. The ordered account map includes: signer; flashloan admin; signer borrow-token account; mint; reserve liquidity; borrow-position-on-liquidity; rate model; vault; liquidity; liquidity program; token program; optional associated-token program; system program; and instructions sysvar.

The instructions sysvar and explicit IDL errors for missing/multiple payback and invalid instruction data indicate that the program enforces same-transaction repayment semantics. This is supportive evidence only. It does **not** replace independently decoding a constructed transaction, verifying all account ownership/relations, or pinning the exact artifact bytes.

## Required evidence before pinning

1. Retrieve `flashloan.json` by an immutable full commit URL rather than `main`.
2. Compute the SHA-256 of exact raw bytes using a deterministic local script and record it beside the artifact.
3. Obtain and decode a sanctioned fixture or SDK-built transaction; compare discriminator, account order, signer/writable flags, optional-account handling, and exact borrow/payback amounts against the pinned IDL.
4. Confirm the linked liquidity program/account relations and all token-program/mint constraints for the selected test mint.
5. Build local mock fixtures proving valid borrow → route → payback and rejecting absent, duplicated, late, reordered, altered-amount, substituted-program, and substituted-account payback cases.
6. Submit the evidence and independent reviewer record through the source-lock template. Only then may `sources.lock.json` change from `blocked` to `pinned`.

## References

[1]: https://dev.jup.ag/docs/lend/flashloan "Jupiter Lend Flashloans"
[2]: https://dev.jup.ag/docs/lend/program-addresses "Jupiter Lend Program Addresses"
[3]: https://github.com/jup-ag/jupiter-lend/tree/main/target/idl/flashloan.json "Jupiter Flashloan IDL"
