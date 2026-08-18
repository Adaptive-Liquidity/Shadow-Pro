# OpenAI/ChatGPT Review Plan — Revised

## 1. Purpose, authorization, and decision rule

This is a **security and readiness review**, not an authorization to operate. It does not authorize deployment; funding; wallet/key generation or import; signer connection; transaction, bundle, or tip submission; airdrops; validator startup; or activity on devnet, testnet, or mainnet.

**Decision rule:** a scope passes only when every assertion is evidenced at one immutable commit, all required tests run inside a network-isolated environment, and the evidence record is complete. Any failed assertion, missing evidence, or unreviewed change is a **FAIL**; no later scope may begin until it is remediated and re-reviewed. “Blocked by policy” is not a pass.

**Readiness boundary:** a project-owned devnet paymaster-only test may be considered only after Scopes 0–5 pass and a separate written approval explicitly authorizes that test. Scopes 6–9 remain blocked.

## 2. Controls that apply to every scope

### Fixed baseline and evidence integrity

- Record the repository URL, default branch, full commit SHA, reviewer identity, UTC start/end times, and toolchain versions before any review work.
- Review a clean worktree pinned to that SHA. All commands must use `--locked`; use `--offline` only after the dependency cache has been prepared in a separately authorized, non-review step.
- Store command output as immutable CI artifacts (or signed, checksummed local logs) and link it from the review record. Screen captures supplement, never replace, machine-readable evidence.
- Do not treat a repository search as proof of absence. Searches are triage only; the reviewer must inspect workflow YAML, manifests, scripts, and reachable command paths.
- Make each security guard a required check with a unique, stable job name and a tested failing fixture. Required checks must run on pull requests and merge-queue commits, if a merge queue is enabled.

### Network and credential containment

- Execute tests in a network namespace/container with outbound network disabled. Capture the containment configuration and the exit code. `--offline` alone is insufficient proof that test code did not attempt a connection.
- Pre-fetching dependencies, `npm ci`, package installation, and tool installation are outside the offline review run and must not execute project lifecycle scripts. Record dependency lockfile hashes and the prefetch provenance separately.
- Run JavaScript tests from a pre-populated cache using `npm ci --offline --ignore-scripts` (or the equivalent package-manager command), then run the named unit-test command under network isolation. Never use an unqualified `npm ci` as offline evidence.
- Inventory repository, environment, and organization secrets/variables available to the repository; inspect workflow references to `secrets.*`, `vars.*`, `id-token`, and `GITHUB_TOKEN` permissions. A repo-only review cannot prove that an organization has no accessible secret, so the evidence must include the applicable organization/environment policy or state the limitation as a FAIL/BLOCKED finding.
- Workflows must use least-privilege explicit `permissions:`; they must not grant `contents: write`, `id-token: write`, or deployment/environment access unless separately approved and justified. No workflow may invoke a deployment, key, signer, transaction, bundle, or external relay command.

### Status vocabulary

| Status | Meaning | Required next action |
|---|---|---|
| PASS | Every assertion is proven at the reviewed SHA. | Independent approval to begin the next scope. |
| FAIL | An assertion is false, evidence is missing, or containment is violated. | Remediate in a new PR; re-run the whole affected scope. |
| BLOCKED | Work is intentionally prohibited or lacks a required external authorization. | Do not test or implement the blocked capability. |
| NOT APPLICABLE | The reviewed SHA contains no such component. | Document why and verify no reachable substitute exists. |

## 3. Review sequence and gates

| Gate | Scope | Outcome required before continuing |
|---|---|---|
| G0 | Baseline and containment | SHA, toolchain, artifact location, and network isolation proven. |
| G1 | Governance and CI | Protected default branch and required guard jobs proven. |
| G2 | Anchor paymaster static review | State machine, authority, accounts, and accounting proven. |
| G3 | Offline test assurance | Targeted unit/property tests pass under containment. |
| G4 | Composer / source-lock review | Immutable allowlist and receipt/manifest controls proven. |
| G5 | Zero-SOL / no-signer posture | No reachable funding, signing, or submission capability. |

Scopes 1–5 may be reviewed in parallel after G0, but a final readiness decision is made only after all are PASS at the **same merge commit**. Re-run affected scopes after any change to program, composer, workflow, dependency lockfile, configuration, or security-sensitive scripts.

## Scope 0 — Baseline, reproducibility, and containment

**Goal:** create a trustworthy evidence set before interpreting any code result.

**Required evidence**

- `git status --porcelain=v1` is empty; `git rev-parse HEAD`; `git show -s --format=fuller HEAD`; dependency lockfile hashes; `anchor --version`, `solana --version`, `rustc -Vv`, `cargo -V`, and Node/package-manager versions where relevant.
- The exact container/network-isolation invocation, including a deliberate connection attempt that fails inside the test environment.
- The list of test targets and scripts selected for this review, with integration tests, validators, and external-service tests explicitly excluded.

**Stop condition:** an unpinned baseline, dirty worktree, unverified toolchain, missing lockfile, or any command escaping network containment.

## Scope 1 — Repository governance and CI protections

**Goal:** ensure security-affecting changes cannot reach the protected branch without independent review and reproducible required checks.

**Assertions**

- The default branch is protected by a branch-protection rule or ruleset that applies to administrators/bypass actors, prevents force-push and deletion, requires pull requests, at least two independent approvals (including required code-owner review), dismissal of stale approvals, and strict required checks. Require signed commits where the repository’s contributor/merge model supports it.
- Required checks are uniquely named, originate from the expected GitHub App where supported, and include: build/lint, offline tests, dependency/source lock, workflow-policy scan, and no-funding/no-signer/no-submission guard.
- `CODEOWNERS` maps every critical path to real maintainers with write access, including `programs/**`, `composer/**`, manifests/allowlists, configuration, dependency lockfiles, `.github/**`, and security/runbook documents. Validate that it is located where GitHub recognizes it and that each owner can be requested.
- Workflows are pinned to immutable action SHAs (or an approved internal immutable action), use minimal permissions, and have no deployment, transaction, relay/bundle, signer, or secret-derived key path.
- Repository, environment, and applicable organization secret/variable policies demonstrate that CI has no deploy key, private key, RPC credential, or signing credential. Record any inaccessible organization policy as a finding rather than asserting absence.

**Efficient verification**

1. Export the active ruleset/branch-protection configuration and default-branch setting through GitHub’s API; review both because rulesets can supersede branch rules.
2. Inspect `CODEOWNERS`, all `.github/workflows/*.yml`, reusable workflows, and action references. Use static search to locate candidates, then inspect each reachable workflow step.
3. Open a non-mergeable fixture PR that changes one critical-path file and one policy guard fixture. Confirm the required guard fails and merge remains blocked; close the PR without merging.

**Stop conditions:** any bypass actor, mutable third-party action, missing code-owner coverage, unrequired guard, insufficient review policy, or credential/submission path.

**Exit evidence:** API JSON, rendered protection/ruleset view, CODEOWNERS coverage table, workflow-review checklist, and fixture PR/run URLs at the reviewed SHA.

## Scope 2 — Static review of the Anchor Shadow Paymaster

**Goal:** prove that the program’s state, accounts, authority model, and settlement accounting are constrained by code—not convention.

**Assertions**

- **Initialization/configuration:** every config, vault, mint, and destination is either compile-time pinned or initialized exactly once through a reviewed authority. Initialization has a one-time guard; no instruction can change an immutable field. If a pause authority exists, it is separately named, constrained, and can alter only pause state.
- **State machine:** the only successful transitions are `Prepared → Finalized → Distributed → Complete`. Each instruction checks the exact prior state, sets the next state atomically after successful effects, and rejects repeat, skipped, and rollback transitions. Settlement PDA seeds include a domain separator and a canonical unique settlement identifier; Anchor seed/bump constraints (or equivalent explicit derivation) are validated for every PDA.
- **Accounting:** define the rounding rule in the specification: `treasury = floor(amount × 15 / 100)` and `payee = amount - treasury`, unless the product specification intentionally chooses another rule. Implement it without intermediate `u64` overflow; verify `payee + treasury == amount` using checked arithmetic. Test 0, 1, 2, 99, 100, 101, and `u64::MAX`.
- **Authority/CPI:** enumerate every signer and every CPI. The control-plane agent is not a transaction signer, fee payer, transfer authority, PDA upgrade authority, or CPI signer. Each external program is constrained to its expected address/program type, and every token/mint/vault/destination account is constrained by owner, address/seed, mint, token program, and authority as applicable.
- **Writable accounts:** every writable account has a purpose and an ownership/identity constraint. `UncheckedAccount`/`AccountInfo` use is justified and guarded; duplicate mutable accounts and close/realloc paths are reviewed explicitly.
- **Pause coverage:** each instruction that can change state or move value enforces the same pause policy; read-only inspection is deliberately identified.

**Required adversarial tests (pure or program-test only; no public network)**

- Boundary/property tests for the split and conservation invariant, including `u64::MAX`.
- Repeat every lifecycle transition; attempt every skipped and rollback edge; verify the custom error and no state/value change.
- Pause at each eligible pre-transition state; confirm the transition fails and read-only inspection remains correct.
- Try altered seeds, identifiers, mints, token program IDs, destinations, and external program IDs; all must fail before side effects.

**Commands/evidence**

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets --locked --offline -- -D warnings`
- `cargo test --locked --offline -p <paymaster-package> --lib -- <explicit-unit-test-filter>` inside network isolation
- `anchor build --skip-lint` only inside the isolated environment, after confirming it performs no deploy/validator action for this toolchain; capture the generated IDL hash and diff it against the committed/approved IDL.
- Record file:line citations for every assertion. Treat `rg` output and `cargo geiger` (if installed) as supplemental triage, not a security conclusion.

**Stop conditions:** missing one-time initialization control, missing state guard, unsafe split, unpinned/unvalidated critical account or CPI, unauthorized signer, or unreviewed mutable account.

## Scope 3 — Offline unit and property tests

**Goal:** demonstrate deterministic behavior under boundary and misuse conditions without a validator, network, signer, or transaction submission.

**Assertions**

- Existing tests and all newly selected property tests pass under verified network isolation.
- Tests are pure unit tests, or use an in-memory simulator explicitly approved for this scope; they must not start `solana-test-validator`, contact RPC, create/import keys, or submit transactions.
- Property tests cover the split rule, conservation, determinism, monotonicity, lifecycle ordering, re-entry, pause behavior, and malformed-account/manifest inputs at a minimum. Persist failing seeds/counterexamples.

**Execution notes**

- Do not run `--ignored` tests by default. First enumerate ignored tests and classify each; run only those demonstrated to be offline and in scope.
- Use explicit test targets. Cargo’s default target selection can build integration tests, binaries, examples, and doctests; `--lib` limits execution to the library target but must be paired with an inventory confirming it covers the intended test module.
- A source check for network APIs complements—never replaces—network-isolated execution.

**Exit evidence:** selected-test inventory, command logs with pass counts, property-test configuration and seed, and links to the test PR/diff.

## Scope 4 — Composer validation and source-lock gate

**Goal:** prove a deny-by-default composer accepts only the exact, reviewed instruction format and authority model.

**Assertions**

- The allowlist binds program ID, instruction discriminator/data schema, account metas (including order, signer/writable flags), amounts, seeds, and any IDL/schema digest to an approved versioned manifest. A program ID match alone is insufficient.
- The expected Jupiter integration is treated as an external dependency: record the authoritative program-ID and interface/version source in the manifest review. The decoder rejects unknown program IDs, schema/digest mismatches, malformed data, reordered account metas or instructions, unexpected signers, and any instruction not expressly allowed.
- Source-lock verification is performed over the canonical source bytes/digest and runs as a required CI check. The lock update path requires a separate reviewed PR and code-owner approval.
- Receipt/authority validation proves the agent cannot be introduced as signer, fee payer, transfer authority, or arbitrary destination. Verify the complete transaction/message representation, not merely a per-instruction field.
- The claimed 32 adversarial cases are named in a test matrix; they all execute and pass under containment. A count alone is not sufficient evidence.

**Minimum negative cases**

- Correct program ID with altered payload/discriminator; altered schema digest; changed amount; reordered account metas; reordered instructions; unexpected compute-budget/system/token/CPI instruction; duplicated instruction; substituted destination; and agent as payer/signer/authority.

**Commands/evidence**

- Build a source-to-test matrix: assertion → test name → file:line → result.
- Rust: `cargo test --locked --offline -p <composer-package> --lib` inside containment.
- TypeScript (only if applicable): install from the prepared cache with scripts disabled, then run the explicit unit-test script inside containment. Do not run unqualified install or integration commands.

**Stop conditions:** any permit-by-default path, unbound instruction field, mutable/unaudited source lock, failing case, or agent role escalation.

## Scope 5 — Zero-SOL agent and denial posture

**Goal:** prove that the agent identity has no ability to acquire funds, sign, pay fees, or submit work, and that this policy is enforced by tests and CI.

**Assertions**

- The intended agent public key (if one exists) is documented as a public identifier only; there is no seed phrase, keypair file, private-key environment variable, remote-signer configuration, or key-loading code reachable from repository tools or CI.
- No reachable code path requests an airdrop, transfers funds to the agent, assigns it as fee payer, creates/signs/submits a transaction, submits a bundle/tip, or configures it as an upgrade/transfer authority.
- The balance snapshot collector is strictly read-only. If it contacts an RPC endpoint, that is an explicit, separately authorized observation step—not an offline test—and it must use a fixed public key with no signer material.
- Deny-by-default configuration and runbooks name prohibited commands/capabilities, required reviewers, rollback/pause owner, and the pre-devnet approval boundary. They must not claim that Jito or Jupiter was runtime-validated while those integrations are blocked.
- A required CI policy test rejects a fixture that introduces each prohibited category: funding, key loading, `feePayer`, signing/submission, and Jito/bundle/tip handling. Use semantically targeted rules/AST scanning where possible; simple word matches are only a backstop.

**Efficient verification**

1. Search for candidate terms (`airdrop`, `transfer`, `feePayer`, `sign`, `keypair`, `send`, `bundle`, `tip`, `jito`) across source, scripts, manifests, and workflow YAML.
2. Trace each hit to determine reachability and capability; search alone does not prove absence.
3. Run the policy fixture suite and confirm the failing check blocks merge on a non-merged PR.

**Stop conditions:** any funding/signing/submission path, missing scanner fixture, or policy that relies solely on an unverified text search.

## 4. Explicitly blocked future scopes

### Scope 6 — Signer custody and policy

**Status: BLOCKED.** Do not create, import, connect, or test keys. Before unblocking, approve a custody threat model, remote/HSM signer design, role separation, dual control, incident recovery, and an auditable address/policy map.

### Scope 7 — Jito integration and bounded tips

**Status: BLOCKED.** Read-only documentation/status review is permissible if separately authorized; bundle construction/submission is not. Before unblocking, define a hard tip cap, transaction-role separation, final-transition-only tip rule, deterministic rejection tests, and independent custody approval.

### Scope 8 — Jupiter/flash-loan integration

**Status: BLOCKED.** Do not assume environment availability or interface stability. Before unblocking, independently verify the official program/interface version, lock the reviewed canonical manifest, and perform authorized environment-specific tests with no agent signer role.

### Scope 9 — Full bundle/mainnet policy

**Status: BLOCKED.** Requires a signed operating authorization, limits, monitoring/alerting, accounting reconciliation, emergency pause/recovery drill, incident ownership, and a separately approved preflight/simulation procedure. No mainnet action is implied by this plan.

## 5. Pre-devnet evidence package and final decision

The lead reviewer produces one package for the exact candidate SHA:

- baseline/toolchain/containment evidence (Scope 0);
- protection/ruleset export, CODEOWNERS coverage, workflow review, and failing guard fixture (Scope 1);
- state/account/authority/accounting citation matrix plus clean build/lint output (Scope 2);
- isolated test inventory, results, and property-test counterexample configuration (Scope 3);
- composer allowlist/source-lock/receipt matrix and named adversarial-test results (Scope 4);
- zero-SOL/no-signer trace, policy-rule fixtures, and runbook review (Scope 5);
- residual risks, known exclusions, and the explicit statement that Scopes 6–9 remain BLOCKED.

The decision is **READY FOR SEPARATE DEVNET-PAYMASTER-ONLY APPROVAL** only if Scopes 0–5 PASS at the same SHA. It is not permission to perform the test. Otherwise the decision is **NOT READY** and must list the blocking findings and owner.

## 6. Review-record template

```text
Scope / gate:
Status: PASS | FAIL | BLOCKED | NOT APPLICABLE
Repository and commit SHA:
Review environment / toolchain:
Network-isolation evidence:
Commands (exact):
Artifacts / run URLs:
Assertions verified (assertion → file:line/test/result):
Negative fixtures executed:
Reviewer (independent of change author):
Residual risk / limitation:
Remediation owner and due date (if not PASS):
Next approval required:
UTC timestamp:
```

## 7. Verification references

- GitHub documents that branch protection/rulesets can require reviews, code-owner approvals, strict status checks, signed commits, and restrictions on bypassing, force-pushes, and deletion: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub’s secrets guidance distinguishes repository, environment, and organization secrets and their access policies; therefore a repository-only scan cannot prove organization-level absence: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- Anchor documents that a PDA is derived from seeds and a program ID, and that `seeds`/`bump` constraints are security checks; `seeds::program` is for a PDA derived with a non-current program: https://www.anchor-lang.com/docs/basics/pda
- Anchor account constraints cover signer, mutability, PDA, ownership, address, token/mint, and custom constraints: https://www.anchor-lang.com/docs/references/account-constraints
- Cargo’s target-selection behavior shows why tests must use explicit targets: https://doc.rust-lang.org/cargo/commands/cargo-test.html
