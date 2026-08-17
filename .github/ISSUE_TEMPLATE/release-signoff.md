---
name: Release sign-off
about: Request human approval for a localnet, public test, or separately governed production release gate
title: "release: "
labels: [release, security]
---

## Requested release boundary

State whether this is localnet, devnet/testnet, disabled mainnet deployment, or a separately approved canary. Mainnet funding, signer activation, and bundle submission require distinct approval records.

## Evidence matrix

| Gate | Evidence reference | Reviewer decision |
|---|---|---|
| Source-lock completeness |  |  |
| Program/IDL/build hash |  |  |
| Adversarial and integration tests |  |  |
| Signer qualification |  |  |
| Relay/Jito qualification |  |  |
| Audit/remediation status |  |  |
| Monitoring, pause, and rollback drill |  |  |
| Agent zero-balance assertion |  |  |
| Treasury/destination authorization |  |  |

## Sign-off

Record named human approvers, approved hard ceilings, environment, expiry, and rollback authority. No approval may delegate an invariant bypass to code or a model.
