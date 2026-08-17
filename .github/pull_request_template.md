## Security change summary

Describe the change in one paragraph. State whether it touches on-chain code, manifest decoding, source locks, signer logic, relay logic, risk limits, destinations, or deployment configuration.

## Invariant and authority impact

- [ ] I identified the affected Shadow Account invariant(s).
- [ ] The agent remains zero SOL and is not a fee payer, vault owner, rent payer, or treasury authority.
- [ ] No caller-controlled program, mint, token account, destination, CPI account, ALT, or payout amount was introduced.
- [ ] State transitions remain fail-closed and replay resistant.

## Source-lock impact

- [ ] No source-lock change is required.
- [ ] This change updates `sources.lock.json`; attached evidence includes immutable source, program/endpoint, IDL/hash, account map, and fixture result.
- [ ] All required dependencies are pinned; no blocked dependency was bypassed.

## Model-assistance disclosure

- [ ] No model assistance was used.
- [ ] Model assistance was used only for development/review. Record provider, model ID, prompt/output artifact location, independent reviewer, and deterministic test evidence below.

## Validation evidence

- [ ] Rust format, tests, and compiler check passed.
- [ ] Composer TypeScript build and adversarial tests passed.
- [ ] New valid-path and negative-path tests were added where behavior changed.
- [ ] No secrets, keys, funded wallets, live endpoints, or transaction artifacts are included.

## Required reviewers

- [ ] `programs/` change: Solana/Anchor security reviewer.
- [ ] `composer/` or source-lock change: deterministic execution-gate reviewer.
- [ ] Authority, destination, signer, fee/tip, or release change: governance reviewer.
