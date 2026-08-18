# GitHub Governance Baseline

The local workspace currently has no configured Git remote. The workflow and templates in `.github/` are ready, but remote branch protection, repository security settings, project board, and code-owner assignment cannot be applied until the connected repository is attached as this workspace’s `origin`.

## Required remote settings

| Setting | Required value |
|---|---|
| Default branch | `main` protected; direct pushes prohibited. |
| Pull requests | Require one approval for ordinary changes and two for `programs/`, `composer/`, `config/sources.lock.json`, signer, destination, risk-cap, or deployment changes. |
| Required checks | `Deterministic validation` workflow must pass. |
| Force pushes / branch deletion | Disabled on `main`. |
| Secret scanning and push protection | Enabled. |
| Dependency alerts and automated dependency pull requests | Enabled. |
| Release tags | Created only from reviewed commits; annotate with build and IDL hashes. |
| Project board | One issue per approved gate, evidence checklist, owner, blocker, and release decision. |

## Code-owner assignment

Create `.github/CODEOWNERS` only after named GitHub reviewer accounts are known. It must require at least one Solana/Anchor reviewer for `programs/`, one deterministic-execution reviewer for `composer/` and `config/`, and one governance reviewer for source locks, signer, destination, fee/tip, and release changes.

## Remote attachment gate

Before pushing the local baseline or turning on remote governance, verify the repository owner, visibility, expected default branch, empty/nonempty history, existing rulesets, and whether the connected repository contains an earlier Shadow Account implementation. Reconcile divergent history through a reviewed pull request; never force-push this local workspace into an existing repository.
