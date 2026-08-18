# Shadow-Pro Engineering Memory and Repository Intelligence Specification

**Status:** Non-production, local-only engineering support system.
**Authority:** Retrieved memory is advisory. Current source, immutable artifacts, deterministic checks, and explicit human approval remain authoritative.
**Prohibited data:** Credentials, API tokens, private keys, wallet seeds, signed transaction bytes, funded-wallet details, and sensitive personal data.

## 1. Design objectives

The system provides durable cross-task recall without autonomous policy changes. It must make repository facts, security decisions, review evidence, and stale assumptions easy to find while making it difficult to mistake old data for current truth.

> Every memory record is scoped to a repository, commit, provenance source, verification state, confidence, and freshness window. A consumer must verify the record against the current candidate SHA before relying on it.

## 2. Storage model

| Component | Location | Format | Purpose | Tracking rule |
|---|---|---|---|---|
| Operational database | `.manus/memory/engineering_memory.sqlite` | SQLite | Exact search, metadata filtering, deduplication, event history, staleness checks. | Ignored and locally generated. |
| Portable export | `.manus/memory/engineering_memory.jsonl` | JSONL | Non-sensitive reviewable export/import evidence. | Tracked only as an intentional named evidence artifact. |
| Working task state | `.manus/memory/working_memory.json` | JSON | Current objective, constraints, files, commands, tests, failures, risk, and next action. | Tracked template only; active runtime file ignored. |
| Repository index | `.manus/index/repository_index.json` | JSON | Static architecture, symbols, accounts, CPI, configs, tests, hotspots, and Git metadata. | Tracked when generated from a named SHA. |
| Gate evidence | `.manus/evidence/` | Markdown/JSON | Command records, artifacts, hashes, review records, and invariant coverage. | Tracked, non-sensitive only. |
| Engineering metrics | `.manus/metrics/` | JSON/Markdown | Evidence-derived quality and process metrics. | Tracked when generated from a named SHA. |
| Playbooks | `.manus/playbooks/` | Markdown | Reusable security review and release procedures. | Tracked. |

## 3. Memory record taxonomy

| Kind | Use | Required verification treatment |
|---|---|---|
| `fact` | Reproducible source, artifact, CI, or RPC observation. | Must name evidence and current source commit. |
| `inference` | Reasoned conclusion from facts. | Must name supporting facts and uncertainty. |
| `hypothesis` | Unproven security or design proposition. | Must remain non-authoritative until tested. |
| `recommendation` | Proposed action or priority. | Requires human/evidence decision before adoption. |
| `decision` | Material architecture/governance choice. | Must record alternatives, rationale, reversal conditions, and approval. |
| `episode` | Completed task retrospective. | Must name changed files, exact commands, results, failures, and residual risk. |
| `artifact` | Immutable hash, build output, IDL, source lock, or evidence record. | Must include hash and provenance. |
| `symbol` | Repository code/index entry. | Must name source file, symbol type, line/reference, and source SHA. |

## 4. Record requirements

Every record must contain project scope, repository scope, source commit, created time, provenance, confidence from 0 to 1, verification status, freshness window, importance from 1 to 5, and content type. The database enforces canonical hashing for deduplication and preserves correction/deletion events rather than silently overwriting history.

Accepted statuses are `candidate`, `verified`, `blocked`, `superseded`, `rejected`, and `deleted`.

## 5. Retrieval and contradiction rules

The initial implementation supports exact text, symbol, metadata, commit, status, recency, and importance retrieval. It warns when records exceed their freshness window. It flags potential contradictions where records share a title but hold incompatible active statuses. A human or deterministic evidence check must adjudicate every contradiction candidate.

Semantic retrieval is intentionally not enabled until an approved embedding route can be evaluated without exposing confidential repository data. No model response can write memory directly without the same metadata, safety screening, and review process as any other input.

## 6. Repository-intelligence index

The index generator must derive, without executing project code:

1. Repository map and module graph.
2. Rust and TypeScript symbol inventories.
3. Anchor account, PDA seed, signer, writable-account, mint, vault, and token-authority inventories.
4. CPI/transfer inventory and external-program references.
5. Composer instruction-classifier, account-meta, ALT, transaction-topology, and signer-role inventory.
6. Configuration, source-lock, environment-variable, CI, test-to-code, dependency, Git change-frequency, and security-hotspot maps.
7. Change-impact reports that identify affected instructions, accounts, invariants, tests, documents, source locks, and a deterministic release-risk classification.

The initial index uses conservative static patterns and marks every heuristic result as `candidate` until source review verifies it. It does not claim full AST or call-graph completeness.

## 7. Lifecycle

1. Load current working memory and verified-state ledger.
2. Confirm candidate Git SHA and clean worktree.
3. Query related memory and verify it against source.
4. Generate/update static index for the candidate SHA.
5. Make minimal scoped changes only after the relevant review scope is complete.
6. Run focused tests, then risk-based expanded checks.
7. Write an evidence-bound episode and any material decision record.
8. Export/review memory only when it is intentionally included in a PR.

## 8. Non-authority boundary

The system must never enable a source lock, create a key, connect a signer, choose a destination, select trade parameters, submit a transaction, change production configuration, or make a financial/release decision. It has no code path for those actions.
