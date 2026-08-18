---
name: Source-lock change
about: Request to add, pin, or modify a trusted program, relay, signer, mint, or account map
title: "source-lock: "
labels: [security, source-lock]
---

## Requested dependency change

State the exact dependency, version/commit, program ID or endpoint, and why it is required. Explain why the current lock cannot remain blocked or unchanged.

## Immutable evidence

| Evidence item | Required value or artifact | Reviewer result |
|---|---|---|
| First-party source URL and retrieval date |  |  |
| Immutable commit/release/IDL reference |  |  |
| SHA-256 / artifact hash |  |  |
| Program ID, endpoint, or account map |  |  |
| Independently decoded interface comparison |  |  |
| Local positive and negative fixture |  |  |

## Security impact

Identify changed trust boundaries, signer roles, account metas, writable accounts, ALTs, fee/tip exposure, settlement destinations, and rollback method. A blocked dependency must stay blocked if any evidence is incomplete or inconsistent.

## Approval

This request requires independent Solana/execution-gate review and governance approval before the source lock is modified.
