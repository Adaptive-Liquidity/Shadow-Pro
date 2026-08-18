# Project Artifact Register

This register identifies the durable project artifacts preserved in the repository and the source of truth for each one. It prevents archival material from being mistaken for an executable configuration or a release authorization.

## Canonical durable records

| Repository path | Purpose | Authority and boundary |
|---|---|---|
| `docs/project/SHADOW_ACCOUNT_VERIFIED_STATE.md` | Cross-task ledger of verified facts, evidence, approvals, and hard blocks. | Update only after reproducible evidence. It cannot authorize deployment, funding, signing, or transaction submission. |
| `docs/evidence/SHADOW_NON_MAINNET_RESEARCH_EVIDENCE.md` | Reproducible read-only evidence for Jupiter Flashloan cluster availability and Jito testnet observation. | Research evidence only. It does not enable any source lock or public-network operation. |
| `docs/plans/END_TO_END_BUILD_PLAN.md` | No-mock, non-mainnet testing and release-gating plan. | A plan, not an execution authorization. |
| `docs/plans/INTEGRATION_RESEARCH_PROMPT.md` | Evidence-first research prompt for unresolved integration questions. | Research aid only; primary-source verification remains mandatory. |

## Historical records retained for traceability

| Repository path | Purpose | Status |
|---|---|---|
| `docs/archive/PLAN_V1.1.md` | Earlier protocol plan retained to preserve decision history. | Superseded by the end-to-end build plan and verified-state ledger. |
| `docs/archive/shadow_account_evidence_notes.md` | Earlier source-evidence working notes. | Historical reference; not a source lock or approval. |

## Deliberate exclusions

| Artifact | Reason |
|---|---|
| Shared `SHADOW_JUPITER_FLASHLOAN_33A22CF7.json` copy | Byte-identical to the canonical retained repository artifact at `evidence/jupiter-flashloan/artifacts/flashloan-33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9.json`; duplicate storage is avoided. |
| Shared legacy `Shadow Account Protocol — Verified State Ledger.md` | Superseded and less complete than `SHADOW_ACCOUNT_VERIFIED_STATE.md`; the canonical ledger is retained instead. |
| Top-level legacy `sources.lock.json` | Diverges from the active fail-closed `config/sources.lock.json`; retaining it as configuration could create ambiguity. The active repository lock is authoritative. |
| Generated outputs, dependencies, local review logs, Git metadata, credentials, keys, and signed transactions | Never committed. They are either reproducible build products, local-only evidence, or prohibited sensitive material. |

## Inclusion rule

A project artifact belongs in version control when it is non-sensitive, reproducible, relevant to the protocol’s source/evidence/runbook history, and clearly marked as canonical or archival. No artifact in this register authorizes public-network activity.
