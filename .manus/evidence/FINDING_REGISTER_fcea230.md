# Gate A Finding Register

**Candidate SHA:** `fcea230b76cb5aa406af089fe568ee93daf509ed`
**PR:** [#1](https://github.com/Adaptive-Liquidity/Shadow-Pro/pull/1)
**Scope:** Governance and current-candidate finding triage.
**Authority:** Source review and deterministic test evidence outrank automated comment text. No entry below authorizes deployment, funding, signing, source-lock enablement, relay use, or public-network execution.

## Evidence inventory

| Evidence | Location | State |
|---|---|---|
| Candidate freeze and lock hashes | Gate A terminal record | Collected for `fcea230`. |
| Current PR inline comments | `.manus/evidence/pr1_inline_comments_fcea230.json` | 47 comments captured from GitHub API. |
| Current PR issue comments | `.manus/evidence/pr1_issue_comments_fcea230.json` | 5 comments captured from GitHub API. |
| Comment inventory | `.manus/evidence/pr1_inline_comment_inventory_fcea230.tsv` | Reviewer/path inventory generated. |
| Source audit | `.manus/evidence/READ_ONLY_AUDIT_7474abb.md` | Applies to source files unchanged between `7474abb` and `fcea230`; re-verification required before remediation. |
| Required CI | GitHub Actions run `32126138973` | Passed; includes Node.js 20 deprecation annotation only. |

## Triage status definitions

| Status | Meaning |
|---|---|
| `verified-open` | Confirmed by current-source review and requires remediation before the affected security gate passes. |
| `fixed-on-pr` | Corrected in the candidate and locally/CI validated, but not effective on protected `main` until reviewed and merged. |
| `candidate-review` | Automated feedback requiring source and test review before acceptance or rejection. |
| `stale` | Refers to superseded source or does not apply to the frozen candidate. Evidence required. |
| `rejected-with-rationale` | Considered and rejected because it conflicts with an approved invariant; rationale must cite source and reviewer decision. |

## Verified-open findings

| ID | Severity | Finding | Evidence | Required remediation gate |
|---|---|---|---|---|
| F-001 | Critical | `FinalizeSettlement` permits a same-mint/PDA-authority substitute `profit_vault` because it lacks `address = config.profit_vault`; later distribution reads from the real vault. | Read-only source audit; `programs/shadow_paymaster/src/lib.rs`. | Gate B. |
| F-002 | High | Composer admission trusts mutable `policy.sourceLockAllowsExecution` rather than deriving eligibility from canonical source-lock validation. | Read-only source audit; `composer/src/types.ts`, `composer/src/gate.ts`, `composer/src/source-lock.ts`. | Gate C. |
| F-003 | High | TX-1 classifier checks are presence/order based, not exact-once/fully bounded; duplicate lifecycle operations, misplaced routes, post-finalize instructions, and DontFront placement need strict decode-backed enforcement. | Read-only source audit; `composer/src/gate.ts`, `composer/test/gate.test.ts`. | Gate C. |
| F-004 | High | Decoded distribution, treasury, and Jito-tip account positions/amounts are not yet bound to canonical policy; declared manifest values cannot be authoritative. | Read-only source audit; composer types/gate. | Gate C. |
| F-005 | High | Source-lock schema allows unknown kinds and ambiguous/missing names; CI/runtime need strict fail-closed schema validation. | Read-only source audit; `composer/src/source-lock.ts`, source-lock guard/tests. | Gate C. |
| F-006 | Medium | Canonical u64 parsing, signer expiry/Base58 error normalization, and fake-relay nonce/earliest-expiry/terminal persistence need hardening. | Read-only source audit; `canonical.ts`, `signer.ts`, `fake-relay.ts`. | Gate C. |
| F-007 | Medium | On-chain destination/vault aliasing, checked transfer semantics, `u128` BPS intermediate math, expiry/liveness authority decision, and unused treasury BPS need resolution. | Read-only source audit; `programs/shadow_paymaster/src/lib.rs`. | Gate B. |
| F-008 | Medium | CI uses floating third-party action tags and lacks the full reproducible-artifact, lint, SBOM, property/fuzz/mutation assurance pipeline. | CI source review. | Gate D. |
| F-009 | Medium | Build/threat/gate documentation contains statements that need reconciliation with current source/evidence. | Read-only source audit. | Gate D and documentation update after remediation. |

## Governance entries

| ID | Status | Finding | Evidence | Remaining condition |
|---|---|---|---|---|
| G-001 | `fixed-on-pr` | Code-owner coverage now includes `.manus/**`, `evidence/**`, `CODEOWNERS`, `Cargo.lock`, and `composer/pnpm-lock.yaml`. | Commit `fcea230`; CI run `32126138973` passed. | Requires `@Adaptive-Liquidity` owner external-review signoff and merge to become active on `main`. |
| G-002 | `owner-signoff-required` | PR #1 has no attributable owner external-review signoff for the current immutable candidate. | GitHub PR review state: `REVIEW_REQUIRED`; owner policy is `docs/governance/OWNER_EXTERNAL_REVIEW_SIGNOFF.md`. | `@Adaptive-Liquidity` must record a SHA-bound owner signoff after unresolved findings are addressed. External model/platform reviews may be attached as supporting evidence. |
| G-003 | `candidate-review` | 47 inline and 5 issue comments remain captured. Most are automated comments on historical or current files; each must be source-verified before closure. | Comment JSON inventory. | Triage comment IDs individually as verified/stale/rejected/fixed before merge. |

## Automated-feedback buckets requiring source verification

| Bucket | Captured paths | Current treatment |
|---|---|---|
| Paymaster authority/account controls | `programs/shadow_paymaster/src/lib.rs` | Covered by F-001/F-007; reconcile every inline comment during Gate B. |
| Composer admission and external interface parsing | `composer/src/gate.ts`, `source-lock.ts`, `signer.ts`, `fake-relay.ts`, `jupiter-flashloan.ts` | Covered by F-002–F-006; reconcile every inline comment during Gate C. |
| Devnet configuration/collector | `scripts/check_devnet_readiness.mjs`, devnet docs/config | Candidate review only; must remain deny-by-default and not add network execution. |
| Memory/index tools | `scripts/manus_memory.py`, `scripts/build_repository_index.py`, seed script | Candidate review only; ensure no secrets, no authority path, deterministic errors, and current-SHA provenance. |
| CI/documentation/archive/template feedback | `.github/**`, `docs/**`, `audit/**`, `README.md`, archive plans | Candidate review only; process as Gate D documentation/CI work, not mixed into critical protocol fixes. |

## Explicit rejected architecture change

A bot suggestion to require the agent signer for every distribution/settlement action is **not automatically accepted**. It changes the permissionless-liveness versus agent-authorization model and may conflict with the zero-capital/no-arbitrary-signing invariant. It is deferred to the Gate B human authority decision and must not be implemented without an explicit documented choice.

## Gate A exit checklist

- [x] Current SHA, clean worktree, PR state, and lock hashes captured.
- [x] Protected-main ruleset and pull-request parameters inspected.
- [x] Code-owner coverage corrected on the review branch and required CI passed.
- [x] Formal source-audit findings entered.
- [x] Current automated feedback captured and bucketed.
- [ ] Every captured comment source-verified and triaged.
- [x] Owner external-review policy recorded.
- [ ] SHA-bound `@Adaptive-Liquidity` owner external-review signoff recorded after Gates B–D changes are completed.

## Current Gate A decision

**Blocked:** Gate A cannot pass until outstanding automated feedback is fully triaged and a SHA-bound `@Adaptive-Liquidity` owner external-review signoff is recorded for the candidate. The next permissible implementation scope is Gate B remediation of F-001 and its directly related on-chain account tests; no later gate may be represented as complete.
