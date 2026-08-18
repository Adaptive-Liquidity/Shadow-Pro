# Gate D F-009: SBOM and Auditable Artifact Evidence

**Candidate base:** `314e35e5fbcc35c27ceec18c0647cc5105f9c436`  
**Scope:** Review-only software-bill-of-material generation and auditable native Shadow Paymaster build.  
**Applied workflow:** `solana-professional` for Rust artifact validation; Gate D CI source-pin procedure.  
**Execution boundary:** No program deployment, test-payer funding, key creation, signing, transaction submission, source-lock enablement, Jito submission, or Jupiter invocation occurs.

## Tool Pinning

| Tool | Pin | Verification source |
|---|---|---|
| pnpm SBOM | `pnpm 11.21.0` | Installed CLI help and native CycloneDX output. |
| cargo-auditable | `0.7.5` | Official crates.io metadata and successful `cargo install --version 0.7.5 --locked`. |
| taiki install action | `5b4d68e2e660441203ab128a23676f1e4faf1532` | Official immutable action README and supported-tools matrix. |
| upload-artifact action | `ea165f8d65b6e75b540449e92b4886f43607fa02` | Official `v4.6.2` reference resolution. |

## Local Validation

A production Composer CycloneDX 1.7 SBOM was generated successfully with:

```text
pnpm sbom --prod --sbom-format cyclonedx
```

The exact pinned Rust tool installed and successfully built the native Shadow Paymaster crate with:

```text
cargo install cargo-auditable --version 0.7.5 --locked
cargo auditable build --locked -p shadow_paymaster
```

The CI workflow generates the Composer SBOM and SHA-256 sums for `Cargo.lock`, `composer/pnpm-lock.yaml`, and the generated SBOM; it uploads those generated materials as a pull-request artifact for 30 days. The artifact is review evidence only and does not authorize release or deployment.

## Retained Limitations

The auditable artifact is a native build artifact, not a deployed Solana BPF artifact or an endorsement of release readiness. Reproducible Solana BPF artifact comparison, program-ID/IDL lock, SBOM policy enforcement, and external-audit review remain separate gates.

## References

[1]: https://pnpm.io/11.x/cli/sbom "pnpm SBOM documentation"
[2]: https://crates.io/api/v1/crates/cargo-auditable "cargo-auditable crate metadata"
[3]: https://raw.githubusercontent.com/taiki-e/install-action/5b4d68e2e660441203ab128a23676f1e4faf1532/README.md "taiki install-action README"
[4]: https://raw.githubusercontent.com/taiki-e/install-action/5b4d68e2e660441203ab128a23676f1e4faf1532/TOOLS.md "taiki install-action supported tools"
