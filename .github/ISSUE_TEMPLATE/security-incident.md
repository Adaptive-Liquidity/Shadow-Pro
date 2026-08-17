---
name: Security incident or rollback
about: Record an invariant breach, signer/relay ambiguity, configuration anomaly, or rollback drill
title: "incident: "
labels: [security, incident]
---

## Detection and immediate action

State the first observed signal, time range, affected environment, and whether the pause/breaker was activated. Do not include secrets, keys, or signed transaction bytes.

## Invariant and impact assessment

| Item | Evidence |
|---|---|
| Potentially affected invariant(s) |  |
| Environment and source-lock hash |  |
| Manifest / receipt / event identifiers |  |
| Funds or test assets at risk |  |
| Agent balance check |  |
| Signer/relay status |  |
| Containment action |  |

## Recovery and prevention

Describe the rollback, verification steps, root cause, regression test, ownership, and human approval needed before any reactivation. Reactivation requires a fresh source-lock, configuration, simulation, and signer review.
