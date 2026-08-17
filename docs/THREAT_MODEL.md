# Shadow Account Protocol Threat Model

**Scope:** Local-only baseline, source-locked Jupiter/Jito integration work, remote-signer qualification, and future public-test progression. This is not an authorization for deployment, funding, signing, or bundle submission.

## Trust boundaries

| Boundary | Trusted only when | Primary failure mode | Required control |
|---|---|---|---|
| Agent intent | Agent holds zero SOL and signs only canonical intent. | Agent becomes fee payer, rent payer, vault authority, or a general transfer authority. | Enforce zero agent balance in harness; fixed role graph; no arbitrary transaction signing. |
| Paymaster program | Fixed config/PDA/vault/mint/destinations and valid state transition. | Account, mint, vault, PDA, program, recipient, or transition substitution. | Anchor typed-account constraints, fixed addresses, checked arithmetic, pause state, negative tests. |
| Jupiter Flashloan | Immutable IDL/program/account map and decoder-reviewed fixture. | Interface drift, forged account map, malformed payback, fee/repayment assumption mismatch. | Blocked source lock until artifact hash, decoder diff, and local negative fixture pass. |
| Route instructions | Exact decoded allowlist inside TX-1. | Opaque route bytes, extra CPI, program/ALT/writable-account escalation, slippage abuse. | Canonical manifest, independent decoder, role/classifier isolation, program/account/ALT allowlists, fee/slippage caps. |
| Remote signer | Exact-byte Ed25519 receipt from a qualified provider. | Provider mutation, key misuse, replay, expiry ambiguity, duplicate request, outage. | Idempotency, request expiry, local verification, receipt persistence, fail-closed breaker, provider vectors. |
| Jito relay | Pinned endpoint and documented status semantics. | Bundle acknowledgement mistaken for landing, tip-recipient substitution, duplicate submission, MEV exposure. | Fake relay first, latest validated tip set, DontFront TX-1, final TX-3 tip, no blind retry, chain reconciliation. |
| Models | Development-only suggestions under independent review. | Hallucinated interface/security claim or model-driven runtime decision. | No model in runtime path; evidence, independent review, deterministic tests, recorded model disclosure. |
| Repository/CI | Protected reviewed source and reproducible artifacts. | Secret leak, dependency compromise, unreviewed security merge, source-lock tampering. | Branch protection once remote is attached, CI checks, secret scan, dependency audit, source-lock review template. |

## Security properties and adversarial evidence

| Property | Evidence that must hold | Current status |
|---|---|---|
| Zero capital risk | Agent is never fee payer/vault owner/treasury authority; local harness rejects any positive agent lamport balance. | Local harness implemented; public-environment proof pending. |
| Flash-loan atomicity | Borrow, route, and repay occur in TX-1 and fail together on absent/duplicate/reordered/altered repayment. | Interface evidence draft only; Jupiter lock blocked. |
| Bundle atomicity | Exactly three ordered transactions; Jito all-or-nothing semantics and chain-status reconciliation. | Fake relay implemented; Jito lock blocked. |
| Exact settlement | Pre/post vault balances, repayment obligations, strict minimum net profit, 15/85 integer split, fixed destinations. | Implemented locally; integration coverage pending. |
| Source integrity | Every external program/relay has immutable artifact reference and hash plus independent decoded fixture. | Jupiter/Jito blocked. |
| Signer integrity | Returned signature verifies against exact serialized message, expected pubkey, nonce, and expiry. | Local receipt verifier exists; provider qualification pending. |
| MEV resistance | Private relay, DontFront marker, tight caps, short expiry, one active nonce, and no public fallback. | Policy/harness evidence only; Jito testnet verification pending. |

## Out-of-scope and release blockers

Production keys, live liquidity, agent funding, mainnet deployment, automatic opportunity selection, fund custody, treasury configuration, signer activation, and live relay submission are out of scope. Any critical/high finding in the Anchor program, manifest decoder, signer adapter, or relay design blocks progression. The strongest unresolved risks are external-interface drift, message-byte mutation, account-meta/ALT substitution, signer ambiguity, Jito status ambiguity, and insufficient operational controls.

## Required assurance sequence

The next assurance work is to run all newly added local tests, add a true local-validator/mock-CPI integration fixture after source-lock evidence permits it, complete signer and Jito fake-adapter tests, generate a dependency/SBOM report, run fuzz/property and mutation tests, then prepare the external-audit package. Each evidence item must identify the source-lock version, Git commit, test command, output hash, reviewer, and unresolved limitation.
