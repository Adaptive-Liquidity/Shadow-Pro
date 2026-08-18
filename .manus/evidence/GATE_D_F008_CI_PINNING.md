# Gate D F-008: CI Toolchain and Action Pinning

**Candidate branch:** `manus/gate-d-hardening`  
**Base commit:** `7ed366454a1e87ad09d78ea50933992ee33b9257`  
**Scope:** Immutable GitHub Action pins, Node 24 CI baseline, Rust toolchain pin, Composer engine declaration, and review-only Dependabot configuration.  
**Execution boundary:** This change does not deploy, fund, sign, connect a signer, enable a source lock, submit a relay bundle, or perform public-network execution.

## Changes

| Control | Result |
|---|---|
| GitHub Actions | Every action used by the two current workflows is pinned to a full upstream commit SHA. |
| Node | Both workflows now select Node 24. Composer declares `node >=24.0.0` and uses `@types/node ^24.0.0`. |
| Rust | `rust-toolchain.toml` pins Rust `1.97.1` with `rustfmt` and `clippy`, matching the verified local Gate D compiler. |
| Dependency updates | Dependabot opens weekly review-required updates for GitHub Actions, npm, and Cargo. No auto-merge policy is introduced. |

## Verified Pin Resolution

The following upstream tags/branches were re-resolved by `git ls-remote` immediately before this change.

| Upstream | Immutable commit | Resolved label |
|---|---|---|
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `v7.0.1` |
| `actions/setup-node` | `820762786026740c76f36085b0efc47a31fe5020` | `v7.0.0` |
| `pnpm/action-setup` | `f40ffcd9367d9f12939873eb1018b921a783ffaa` | `v4` |
| `DavidAnson/markdownlint-cli2-action` | `992badcdf24e3b8eb7e87ff9287fe931bcb00c6e` | `v20` |
| `dtolnay/rust-toolchain` | `4360b52568e2003a75bf9bc1d59f33a8e3fc893c` | `stable` branch state at resolution time |

## Local Validation

The source-lock guard, program-identity guard, devnet deny-by-default guard, secret scan, Rust formatter, 11 Anchor unit tests, Anchor compile check, Composer TypeScript build, and 52 Composer adversarial tests passed locally under Rust `1.97.1`.

The local shell remains on Node `22.13.0`, so pnpm correctly emitted an engine warning after the new `>=24` declaration. The changed GitHub workflows are the authoritative runtime validation target and must pass under Node 24 before owner review.

The only observed Anchor diagnostics are the four established `unexpected_cfgs` warnings emitted by Anchor macro expansion; no new compiler warning was introduced by this CI-only scope.

## Remaining Gate D Work

SBOM generation, reproducible Anchor artifacts, property/fuzz testing, devnet guard hardening, repository-index provenance, memory-tool hardening, documentation reconciliation, and relay-interface work remain outside this isolated commit.

## References

[1]: https://github.com/actions/checkout/tree/3d3c42e5aac5ba805825da76410c181273ba90b1 "actions/checkout pin"
[2]: https://github.com/actions/setup-node/tree/820762786026740c76f36085b0efc47a31fe5020 "actions/setup-node pin"
[3]: https://github.com/pnpm/action-setup/tree/f40ffcd9367d9f12939873eb1018b921a783ffaa "pnpm/action-setup pin"
[4]: https://github.com/dtolnay/rust-toolchain/tree/4360b52568e2003a75bf9bc1d59f33a8e3fc893c "dtolnay/rust-toolchain pin"
