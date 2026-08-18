# Project-Local Engineering Memory

This directory holds non-sensitive, evidence-bound engineering memory for Shadow-Pro. It is designed to reduce context drift across tasks while preserving the rule that **current source, deterministic tests, immutable artifacts, and explicit human approval are authoritative**.

> Memory is a retrieval aid. It is never an execution authorization, signing authority, source-lock override, or substitute for checking the current candidate commit.

## Layout

| Path | Purpose | Version-control status |
|---|---|---|
| `.manus/memory/engineering_memory.sqlite` | Local SQLite operational store. | Ignored; regenerate from tracked exports or current evidence. |
| `.manus/memory/engineering_memory.jsonl` | Export of non-sensitive memory records. | Tracked only when intentionally updated as evidence. |
| `.manus/index/` | Generated repository maps and static indexes. | Tracked when generated from a named commit. |
| `.manus/evidence/` | Gate-specific hashes, command records, and immutable review records. | Tracked; never store credentials or signed transaction bytes. |
| `.manus/metrics/` | Deterministic engineering metrics derived from evidence. | Tracked when generated from named commits. |
| `scripts/manus_memory.py` | Standard-library CLI for memory storage and retrieval. | Tracked. |

## Required metadata

Every memory item must include project scope, source commit, timestamp, provenance, confidence, verification status, freshness window, importance, and classification as a fact, inference, hypothesis, recommendation, decision, episode, artifact, or symbol.

The only accepted statuses are `candidate`, `verified`, `blocked`, `superseded`, `rejected`, and `deleted`. A `verified` record still must be checked against the current candidate SHA before use.

## Repository intelligence commands

```bash
# Static index for the current candidate; it does not execute project code.
python3 scripts/build_repository_index.py build --output .manus/index/repository_index.candidate.json

# Static impact report for a reviewed change range.
python3 scripts/build_repository_index.py impact --base <immutable-base-sha> --head <immutable-head-sha> --output .manus/evidence/impact_<base>_to_<head>.json
```

The index inventories symbols, heuristic Anchor account/PDA/CPI/writable-account surfaces, transaction/ALT/signer references, JSON configuration, dependencies, tests, environment references, security hotspots, and Git change frequency. Its results are explicitly `candidate` evidence and require source review.

## Safe workflow

1. Run `python3 scripts/manus_memory.py status` to inspect stale and contradiction candidates.
2. Search exact text or metadata with `python3 scripts/manus_memory.py search <query>`.
3. Verify retrieved claims against the current Git SHA, source files, immutable evidence, and test output.
4. Add an item only after evidence exists. Do not add credentials, keys, raw signed transactions, funded-wallet details, or endpoint tokens.
5. Use `correct` to supersede a mistaken item and `delete` to tombstone an item without erasing its audit history.
6. Export intentionally reviewed records with `python3 scripts/manus_memory.py export`.

## Retrieval capabilities

The initial implementation supports exact text search, symbol records, metadata filtering, commit/status filtering, importance ranking, recency ranking, deduplication by canonical content hash, stale-record warnings, tombstoned deletion, correction/supersession, JSONL export, and deterministic episodic-retrospective extraction.

Semantic retrieval is intentionally **not enabled** until an approved local or hosted embedding implementation can be evaluated without exposing secrets or private project data. Contradiction detection initially flags same-title records with incompatible statuses; each candidate requires human/evidence adjudication.

## Explicit exclusions

Never commit or store private keys, wallet seeds, API tokens, sensitive endpoint credentials, raw signed transactions, funded-wallet details, or production deployment material in `.manus/`.
