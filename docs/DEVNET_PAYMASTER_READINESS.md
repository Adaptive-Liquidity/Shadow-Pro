# Shadow Paymaster Devnet Readiness

**State:** Preparation only. This document does not authorize deployment, key creation, faucet funding, signer connection, transaction submission, bundle submission, or any mainnet activity.

## Purpose and boundary

Devnet can verify only the project-owned Shadow Paymaster’s deployment and settlement controls. It cannot verify a real Jupiter Flashloan or Jito-protected three-transaction flow: the published Jupiter Flashloan program ID is not deployed on devnet, and Jito does not publish a devnet Block Engine path. The project prohibits mock-program substitution. [1] [2] [3]

> A devnet paymaster test must never be labelled a Jupiter Flashloan test, Jito bundle test, MEV-protection test, or full end-to-end protocol test.

## Immutable safety configuration

The template at `config/devnet-readiness.template.json` is deny-by-default. Its execution, deployment, funding, signer, Jito, and Jupiter flags must remain `false` until a separately approved test run prepares a derived, uncommitted configuration. It intentionally has no public keys, endpoint credentials, wallet paths, program IDs, mints, vaults, destinations, or key references.

The existing `Anchor.toml` remains localnet-only. Do not change its provider cluster, wallet, or program address merely to prepare devnet. A future devnet configuration must be reviewable in a pull request and must never reuse a production program ID, wallet, authority, mint, vault, destination, source-lock hash, configuration hash, or signer policy.

## Required evidence before an approval request

| Evidence | Required property |
|---|---|
| Paymaster build | `cargo fmt --check`, `cargo test -p shadow_paymaster`, and `cargo check -p shadow_paymaster` pass from the exact review commit. |
| Composer | Strict build and adversarial suite pass from the exact review commit. |
| Source lock | Jupiter and Jito remain fail-closed; no external execution path is enabled. |
| Program artifact | Build hash, Anchor/Solana/Rust toolchain versions, and generated IDL hash are recorded. |
| Configuration | A derived test-only configuration has a unique hash and no production value reuse. |
| Accounts | Every proposed public address is classified as test-only, and each is supplied only in an approval request—not committed. |
| Agent invariant | A read-only preflight records zero SOL for the agent before the first submitted devnet transaction; the same assertion is repeated after every test. |
| Stop conditions | Pause state, test fee cap, test count cap, expected state transitions, rollback/close plan, and incident owner are defined. |

## Approval-bound devnet test sequence

1. Submit a separate approval request naming the exact review commit, derived configuration hash, program artifact hash, designated public test payer, requested faucet/test funding maximum, proposed program ID, intended test mint/vault/destinations, transaction count cap, fee cap, and stop conditions.
2. After approval, create or use only designated test-only identities. The agent public key must remain unfunded and must not appear as fee payer.
3. Deploy the reviewed paymaster program only if deployment itself is approved. Record public deployment receipt, program ID, executable status, program-data/upgrade-authority policy, and artifact verification result. Keep configuration paused after initialization.
4. Provision test mint, vault, and destinations only outside the protected-bundle model. Record their public addresses in a redacted test receipt; do not place keys, seed phrases, credentials, or signed payloads in the repository or evidence ledger.
5. Run direct paymaster test transactions one at a time. The required matrix is initialization-paused, governance-only pause change, valid `Prepared → Finalized → Distributed → Complete`, failed pre-balance, expired settlement, insufficient profit, duplicate nonce, invalid state transition, wrong mint/vault/destination, repeated distribution, and zero-agent-SOL before/after every case.
6. After each result, fetch and store read-only public account and balance evidence. A mismatch, nonzero agent balance, unexpected event, fee-cap breach, or any external dependency instruction is an immediate stop; pause the program, preserve evidence, and do not continue.
7. End the test by returning the deployment configuration to paused and preparing a review record. No next environment, signer, Jito, Jupiter, or mainnet action is implied.

## Explicit no-go conditions

Do not request or perform devnet deployment when any of the following is unresolved: source-lock inconsistency; unreviewed code; failing/reduced test suite; missing deterministic artifact hash; missing separate approval; any production value in configuration; a funded agent; a remote signer; a Jupiter Flashloan instruction; a Jito tip or submission; an unknown fee payer; or any account/setup instruction proposed for a protected bundle.

## References

[1]: https://developers.jup.ag/docs/lend/program-addresses "Jupiter Lend program addresses"
[2]: https://docs.jito.wtf/lowlatencytxnsend/ "Jito Low Latency Transaction Send"
[3]: https://solana.com/docs/defi/mev-protection "Solana MEV Protection with Jito DontFront"
