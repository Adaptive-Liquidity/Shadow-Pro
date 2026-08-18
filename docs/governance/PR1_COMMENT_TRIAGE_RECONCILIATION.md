# PR #1 Comment Triage Reconciliation

**Current review-branch head when prepared:** `9a2f95941b8e1a688a5171c48e262a9263f2dc15`
**Raw GitHub feedback inventory:** 47 inline comments and 5 issue comments, for 52 captured comments.
**Owner and accountable final reviewer:** `@Adaptive-Liquidity`
**Supporting review input:** User-supplied complete comment triage and owner audit, retained as advisory review evidence.
**Authority order:** Current source and deterministic test evidence; immutable evidence artifacts; owner external-review signoff; automated-comment text.

> This reconciliation changes neither source locks nor any execution permission. It does not authorize deployment, funding, key creation, signing, transaction submission, Jito submission, Jupiter activation, or public-network execution.

## Count reconciliation

The user-supplied triage is valuable but labels its cases `T-001` through `T-053` while calling the source set 52 comments. This is explained by an intentional split of one raw comment into two decisions: `T-009` rejects the agent-signer proposal, while `T-010` accepts its independent expiry-check concern. The canonical raw-comment count remains **52**. The current raw JSON evidence and original GitHub node IDs remain the source of record in `.manus/evidence/pr1_*_fcea230.json`.

## Provenance verification

The static audit was performed at `7474abb1fe49f45458ba69e5cc3becbbdaefd5f7`. A current Git comparison found no changes under `programs/` or `composer/` between that SHA and `fcea230b76cb5aa406af089fe568ee93daf509ed`. The source-based Gate B and Gate C findings therefore remain applicable to that audit candidate. The later evidence-only commits require each later remediation candidate to be reviewed and tested at its own immutable SHA.

## Owner-review model

`@Adaptive-Liquidity` is the accountable final reviewer. Reviews performed on external models or platforms are supporting evidence only. A final Gate signoff must use [`OWNER_EXTERNAL_REVIEW_SIGNOFF.md`](OWNER_EXTERNAL_REVIEW_SIGNOFF.md), name the exact immutable candidate, list accepted/rejected findings and residual risks, and link attributable GitHub approval or commit-signature evidence.

Owner approval cannot waive a missing account constraint, failed deterministic test, stale or invalid manifest, invalid signature, nonzero agent balance, unpinned source lock, unavailable integration, or any separately required funding/deployment/submission approval.

## Accepted verified findings

| Group | Decision | Gate | Required outcome |
|---|---|---|---|
| T-006/T-007/T-008 | Accepted as F-001. `FinalizeSettlement.profit_vault` lacks the configured-vault address constraint. | B | Bind the account to `config.profit_vault`; prove a same-mint/PDA-authority substitute vault rejects before accounting or distribution. |
| T-010 | Accepted within F-007. Permissionless settlement remains an architecture choice, but expiry behavior requires a documented liveness/security decision and test. | B | Do not add agent signer automatically; resolve expiry semantics with exact state-machine evidence. |
| T-015–T-024/T-028 | Accepted as F-002 through F-006 except stale duplicate claims noted below. | C | Derive source-lock authority, enforce exact instruction/account/amount bindings, reject schema ambiguity and parsing/receipt/relay edge cases. |
| T-029–T-037 | Accepted as F-012 through F-014. | D | Make devnet guard and memory/index provenance fail closed; add targeted tests. |
| T-038/T-039 | Accepted as F-015. | C | Require exactly one borrow and exactly one payback in immutable-IDL extraction. |
| T-040–T-045/T-049/T-051–T-053 | Candidate documentation/CI/provenance work. | D | Reconcile only after source findings are fixed and current evidence hashes are regenerated. |
| T-047/T-048 | Code-owner coverage is corrected on the PR branch. | A/D | Keep as `fixed-on-pr` until owner signoff and merge. |

## Source-verified exceptions and deferred decisions

| Triage input | Decision | Rationale |
|---|---|---|
| T-009 agent-signer requirement | Rejected with rationale. | Requiring an agent signer for every distribution/settlement changes the permissionless-liveness model and is not a safe automatic remediation. The expiry portion remains separately accepted as F-007. |
| T-011/T-012 `declare_id!` replacement | Deferred governance decision; do not apply the proposed literal replacement. | `Anchor.toml` and `config/sources.lock.json` use an intentionally unapproved local-only placeholder while `declare_id!` uses Anchor's template identity. A real program ID must be created/selected only in the owner-approved test-only program-ID lifecycle; hardcoding an unapproved placeholder would make identity claims less accurate, not safer. |
| T-025/T-026/T-027 truncated instruction-sysvar claim | Stale on current source. | The current implementation literal exactly equals the proposed literal: `Sysvar1nstructions1111111111111111111111111` (43 characters). No code change is warranted from this claim. Borrow/payback account binding in T-028 remains accepted. |
| T-001/T-004 | Stale status messages. | No actionable source finding. |
| T-003 | Candidate follow-up backlog. | Config-template, stale-salvage, and CI failure-mode evidence are Gate D work; they are not a current protocol finding. |
| T-050 archive approval schema | Deferred classification. | The referenced document is archived; current execution code must be reviewed independently before any current-schema claim is accepted. |

## Gate A decision

**Owner-review governance is established, but Gate A remains blocked.** The remaining actions are to attach the exact raw GitHub node IDs to the individual triage rows, carry accepted findings into isolated Gate B/C/D remediation commits, and record a SHA-bound owner external-review signoff for each resulting candidate. No technical hard block is removed by this governance correction.
