# Shadow-Pro Engineering Operating Protocol

## Purpose

This protocol makes the engineering workflow **traceable, evidence-bound, and repeatable**. Specialized skills, model/connector assistance, project memory, and repository state are aids to disciplined implementation; none is an authority to sign, fund, deploy, submit, or bypass technical controls.

## Required Per-Gate Workflow

Every engineering gate must begin by freezing one candidate SHA and recording its objective, scope, affected paths, external dependencies, risk class, and execution boundary in `.manus/memory/working_memory.template.json` or an approved derived record. Before code changes, the agent must retrieve relevant active memory, inspect the repository index/change-impact report, and read the mandatory security skill for the affected layer.

| Scope | Mandatory skill/workflow | Primary evidence |
|---|---|---|
| Anchor, Rust, accounts, PDAs, CPIs, tokens, arithmetic | `solana-professional` | Account matrix, state transitions, unit/property tests, compiler output |
| Paymaster authority, settlement, treasury, governance | `shadow-account-protocol` | Invariant ledger, authority record, state-machine evidence |
| Manifest, simulation, source locks, signer receipts, Jito | `shadow-execution-gate` | Exact-byte fixtures, source-lock status, decoder and negative-test evidence |
| Automation, external services, relay/signing runtime | `automation-and-scheduling` and `persistent-computing` | Threat model, containment decision, approval-bound runbook |
| New or revised project skills | `skill-creator` | Skill validation output and versioned workflow |

## Model and Connector Routing

OpenAI/ChatGPT is the default first research and review assistant for unresolved protocol questions, as directed by the project owner. Its output is treated as untrusted analysis until anchored to source code, immutable artifacts, official documentation, read-only RPC evidence, or deterministic tests.

| Tool or connector | Permitted role | Explicitly prohibited role |
|---|---|---|
| OpenAI/ChatGPT | Research plan, threat-model critique, finding triage, test-case ideas, review of a frozen SHA | Approval authority, transaction construction authority, signing, funding, deployment, or source-lock enablement |
| Hugging Face coding models | Scoped Rust/Anchor or TypeScript implementation/review after capability qualification | Silent autonomous merges, signing, relay submission, custody access |
| Gemini | Secondary cross-model research or document review when explicitly invoked | Custody, execution authority, bypassing deterministic gate checks |
| GitHub | Immutable review history, PR checks, owner signoff, branch protection, issue/audit record | Replacing local validation or source-of-truth evidence |
| Solana Agent Kit | Approved upstream dependency; discovery/data integration only after a separately reviewed adapter decision | Anchor program use, source-lock authority, Paymaster/signer access, trade/Jito/bridge submission, generic action exposure |

For each model-assisted change, the PR record must state: candidate SHA, model/provider, prompt or prompt hash, retrieved evidence, accepted and rejected findings, deterministic verification commands, residual risk, and the owner signoff link.

## Memory Contract

The project uses three complementary memory layers.

1. **Durable project ledger:** `docs/project/SHADOW_ACCOUNT_VERIFIED_STATE.md` records only reproducible cross-task facts, decisions, evidence, and hard blocks.
2. **Repository-local SQLite memory:** `.manus/memory/manus_memory.sqlite3` stores active fact, decision, episode, artifact, symbol, and recommendation records. It is local and ignored; verified exports may be reviewed explicitly.
3. **Human-readable evidence:** `.manus/evidence/`, `.manus/playbooks/`, `docs/`, and `audit/` contain immutable SHA-bound review records, runbooks, and findings.

Every successful validation adds a memory record with the candidate SHA, evidence paths, affected scope, test result, confidence, and expiry/review condition. Every correction tombstones or corrects the prior memory record; no past conclusion is silently overwritten. Facts without reproducible evidence remain labelled as assumptions or blockers.

## Connector Preflight

Before connecting or invoking an external service, record: provider, exact purpose, account/key role, data sent, data received, scope cap, timeout, audit log location, failure behavior, and rollback/revocation procedure. No connector may receive a private key, seed phrase, production credential, funded wallet, or signed transaction bytes in project memory or source control.

## Definition of Done for a Gate

A gate is complete only when the frozen SHA, applied skills, model/connector record, memory update, tests, review evidence, source-lock outcome, residual risk, and explicit owner decision are all recorded. If any condition is missing, the gate remains in progress and later gates must not rely on it as verified.
