# Shadow Paymaster Devnet Test Approval Request

**Status:** Template only. Filling this document does not approve an action.

> This request applies only to a project-owned Shadow Paymaster test on devnet. It must not include Jupiter Flashloan, Jito submission, DontFront claims, remote-signer use, mainnet assets, production values, or an end-to-end protocol claim.

## Immutable review inputs

| Field | Required value |
|---|---|
| Review commit | `UNSET` |
| Pull request URL | `UNSET` |
| Program artifact SHA-256 | `UNSET` |
| Generated IDL SHA-256 | `UNSET` |
| Toolchain versions | `UNSET` |
| Devnet configuration SHA-256 | `UNSET` |
| Source-lock SHA-256 | `UNSET` |
| Local validation evidence | `UNSET` |
| Required CI run URL | `UNSET` |

## Isolated public test identities and accounts

All fields are public addresses only. Do not add key material, seed phrases, credentials, endpoint tokens, signed payloads, or funded-wallet details.

| Role | Public address | Test-only assertion |
|---|---|---|
| Deployment authority | `UNSET` | Distinct from all production authorities. |
| Test fee payer | `UNSET` | Pays only capped devnet fees; never the agent. |
| Agent | `UNSET` | Begins and ends with exactly 0 lamports. |
| Governance | `UNSET` | Test-only; initializes configuration paused. |
| Program ID | `UNSET` | Unique devnet deployment only. |
| Test mint | `UNSET` | Test-only; not a production mint. |
| Profit vault | `UNSET` | Bound to test config and vault authority PDA. |
| Paymaster destination | `UNSET` | Test-only and distinct from treasury. |
| Treasury destination | `UNSET` | Test-only and distinct from paymaster destination. |

## Requested actions and limits

| Control | Requested value |
|---|---|
| Deployment requested | `false` |
| Test-payer funding requested | `false` |
| Maximum requested test funding | `0` |
| Maximum transaction count | `0` |
| Maximum fee exposure in lamports | `0` |
| Transaction submission requested | `false` |
| Signer connection requested | `false` |
| Jupiter Flashloan requested | `false` |
| Jito submission or tip requested | `false` |
| End state | `Program paused; no external dependency enabled.` |

## Required test matrix

Record expected result and resulting public evidence for each approved case: paused initialization; governance-only pause update; valid settlement lifecycle; wrong mint; wrong vault; wrong destination; expired settlement; pre-balance mismatch; repayment/obligation shortfall; insufficient profit; duplicate nonce; invalid transition; repeated distribution; and before/after zero-agent-SOL assertion.

## Stop conditions

Immediately pause and stop on any nonzero agent balance, unexpected signer/fee payer, unknown account or program, Jito/Jupiter instruction, source-lock mismatch, unexpected event/state transition, fee-cap breach, missing artifact/configuration hash, test failure, or receipt discrepancy.

## Human approval record

| Field | Value |
|---|---|
| Approver | `UNSET` |
| Approval scope | `UNSET` |
| Timestamp | `UNSET` |
| Explicitly authorized actions | `UNSET` |
| Explicitly excluded actions | `Jupiter, Jito, remote signer, mainnet, production values, and any unlisted transaction.` |
| Expiry | `UNSET` |

No action may occur after the stated expiry or outside the explicit scope.
