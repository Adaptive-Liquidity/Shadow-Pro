# Branch Protection Configuration

Use the GitHub web UI to protect `main` after both workflows in `.github/workflows/` are present on the default branch.

## 1. Open the branch protection settings

1. Go to **Settings** for `Adaptive-Liquidity/Shadow-Pro`.
2. Open **Branches** (or **Rules** → **Rulesets** if your organization uses rulesets).
3. Create a new rule for the `main` branch.

## 2. Require pull requests and reviews

Enable these review gates:

- **Require a pull request before merging**
- **Require approvals**
- **Require review from Code Owners**
- **Dismiss stale pull request approvals when new commits are pushed**

The repository already includes `CODEOWNERS`, so enabling the code-owner review requirement will enforce those ownership rules automatically.

## 3. Require all status checks to pass

Enable **Require status checks to pass before merging**, then add these checks:

- `Deterministic validation`
- `Governance and security checks`

Also enable **Require branches to be up to date before merging** so the checks run against the latest `main`.

## 4. Prevent force-push and bypass paths

Disable or leave unchecked:

- **Allow force pushes**
- **Allow deletions**
- Any bypass that would let unreviewed changes merge to `main`

## 5. Limit merge methods

Under **Pull Requests** in repository settings:

1. Enable **Allow squash merging**
2. Enable **Allow rebase merging**
3. Disable **Allow merge commits**

This keeps `main` limited to squash/rebase merges only.

## 6. Save and verify

After saving the rule:

1. Open a test pull request.
2. Confirm both required checks appear.
3. Confirm GitHub blocks merge until the checks pass and CODEOWNERS approval is present.
4. Confirm force-push is rejected for `main`.

For the broader governance baseline and reviewer expectations, also keep `docs/GITHUB_GOVERNANCE.md` aligned with this configuration.
