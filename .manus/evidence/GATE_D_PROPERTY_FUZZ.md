# Gate D: Deterministic Property and Fuzz Test Scaffold

**Candidate base:** `a0b301791e39cb633396cb46faf483c78297f403`
**Scope:** Test-only hardening of pure settlement arithmetic, canonical manifest normalization, atomic-unit parsing, and manifest-admission rejection behavior.
**Applied workflows:** `solana-professional`, `shadow-account-protocol`, and `shadow-execution-gate`.
**Execution boundary:** No program deployment, funding, protocol key creation, transaction signing, source-lock enablement, Jupiter invocation, Jito submission, remote-signer activation, or capital movement occurs.

## Reproducible Test Controls

| Surface | Dependency | Deterministic control | Coverage |
|---|---|---|---|
| Anchor/Rust pure helpers | `proptest = 1.11.0` (dev-only) | `TestRunner::deterministic()` | Fixed corpus for profit conservation, strict minimum rejection, and strict expiry semantics. |
| Composer pure helpers and admission gate | `fast-check = 4.9.0` (dev-only) | Seed `0x5a17_2026`, `512` runs, `endOnFailure: true` | Canonical hash stability, full `u64` parse acceptance, 1500/8500 split conservation, expired-transaction rejection, and generated destination-substitution rejection. |

The Rust runner uses Proptest's deterministic runner API. The TypeScript properties use a fixed fast-check seed, bounded corpus, and failure-stop configuration. A failing fast-check run reports its seed and shrink path for replay. [1] [2] [3]

## Invariants Exercised

| Invariant | Property asserted | Failure behavior retained |
|---|---|---|
| INV-03 | Every generated expiry at or before the active slot is rejected before manifest admission. | `EXPIRED` |
| INV-04 | Every generated non-policy treasury destination is rejected before instruction admission. | `DESTINATION_DENIED` |
| INV-05 | For all valid generated settlement inputs, eligible profit equals the fixed 1500/8500 shares' sum; the paymaster share is floor(`eligible × 1500 / 10000`); profit equal to the minimum is rejected. | `NetProfitInsufficient` or deterministic reject |
| Canonical authorization binding | Canonical JSON and manifest hash are independent of object insertion order; all generated in-range atomic-unit strings parse exactly. | Canonicalization/parser throws fail closed on unsupported or out-of-range values. |

## Retained Limits

This scaffold deliberately exercises only pure, local code and synthetic manifest records. It is **not** a Jupiter, Jito, remote-signer, public-RPC, bundle, deployment, or integration test. The Jupiter and Jito source locks remain blocked; no mock program is introduced as a substitute for either external dependency.

The deterministic property corpus complements rather than replaces the existing example-based adversarial tests, source-lock gate, future fuzz expansion, real non-production dependency evidence, and external audit.

## References

[1]: https://docs.rs/proptest/latest/proptest/test_runner/struct.TestRunner.html "Proptest TestRunner documentation"
[2]: https://fast-check.dev/docs/advanced/fuzzing/ "fast-check fuzzing documentation"
[3]: https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/ "fast-check test-report replay documentation"

## Local Validation

The exact candidate was validated locally with the pinned Rust `1.97.1` toolchain and the frozen Composer lockfile:

```text
cargo fmt --all -- --check
cargo test --locked -p shadow_paymaster
cargo check --locked -p shadow_paymaster
cargo clippy --locked -p shadow_paymaster -- -D warnings
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm audit --prod --audit-level high
```

| Check | Result |
|---|---|
| Rust unit and property suite | **14 passed**; the three new fixed-corpus property tests passed. |
| Rust formatting, check, and Clippy | Passed. |
| Composer type check | Passed. |
| Composer adversarial and property suite | **57 passed**; the five new fixed-seed property/fuzz tests passed. |
| Production dependency audit | Passed; no known vulnerabilities reported. |
| Local Node compatibility | Node `22.13.0` emitted the expected package-engine warning because CI is pinned to Node `24.19.0`; no test failed. |

Remote CI remains the merge authority and must rerun against the signed candidate before any Gate D finding is treated as merged.
