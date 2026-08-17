# Shadow Account Protocol External Audit Package

This package is an evolving index for an eventual independent Solana/Anchor and off-chain execution-control audit. It does not claim audit readiness or a clean result. Each artifact must be regenerated from a reviewed Git commit and identified by immutable hash.

| Artifact | Repository location | Current state |
|---|---|---|
| System invariants and threat model | `docs/THREAT_MODEL.md` | Drafted for local baseline. |
| Build status and blockers | `docs/BUILD_STATUS.md` | Local baseline evidence; integration blockers active. |
| Source locks | `config/sources.lock.json` | Jupiter/Jito remain blocked. |
| Jupiter evidence draft | `evidence/jupiter-flashloan/` | Program/IDL observations captured; immutable artifact hash missing. |
| Jito evidence draft | `evidence/jito/` | API/status/DontFront observations captured; endpoint lock missing. |
| Remote signer qualification | `docs/REMOTE_SIGNER_QUALIFICATION.md` | Provider-neutral protocol; no provider selected. |
| Anchor program | `programs/shadow_paymaster/` | Local-only unit-tested baseline. |
| Composer controls | `composer/src/` and `composer/test/` | Deterministic gate, local harness, fake relay, and adversarial tests. |
| Release governance | `.github/` and `docs/GITHUB_GOVERNANCE.md` | Local templates/CI added; no local Git remote attached. |

## Auditor questions

The eventual auditor should validate account constraints; PDA derivations; state-machine reachability; token-account/mint/program substitutions; arithmetic and rounding; source-lock update process; versioned transaction/ALT decoding; signer receipt exact-byte verification; remote-signer policy boundaries; relay status and duplicate handling; MEV assumptions; test quality; and deployment/canary governance. The audit scope must include both the Anchor program and the off-chain composer/signer/relay controls.

## Evidence admission rule

No document may describe a blocked integration as implemented or production-ready. External source claims require primary URL, immutable version/commit, retrieval date, artifact hash, independently decoded interface evidence, test result, and reviewer record. Model output may be included only as a non-authoritative review artifact with its provider/model ID and deterministic validation evidence.
