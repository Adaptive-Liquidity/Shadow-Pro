# Model Routing Policy

## Enforced principle

Models are development assistants only. They shall never run in the production decision, signing, transaction-composition, simulation-verification, or bundle-submission path. Deterministic code, source locks, human release approval, and cryptographic verification are authoritative.

## Current connector result

The active Hugging Face integration was audited on 2026-08-16. It exposes Hub search/details/files and Space discovery, but it does not expose a text-generation, coding-inference, model-endpoint, or provider invocation tool. Therefore none of the Qwen coding candidates can presently be used through this connector for generation.

| Workstream | Required route | Current state |
|---|---|---|
| Rust and Anchor | Hugging Face qualified Qwen Coder candidate plus `solana-professional`; independent deterministic test/review. | **Blocked:** no available HF inference route. |
| TypeScript/Python composer | Hugging Face qualified Qwen Coder candidate plus `shadow-execution-gate`; deterministic test/review. | **Blocked:** no available HF inference route. |
| Architecture/economics/MEV review | Strong reasoning model plus independent reviewer and source evidence. | **Manual review only:** no model may make parameter or execution decisions. |

## Verified model-card availability

| Candidate | Verified Hub metadata | Qualification state |
|---|---|---|
| [Qwen3-Coder-480B-A35B-Instruct](https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct) | Apache-2.0, text-generation, 480B total parameters / MoE, and listed inference providers. | Candidate only; not callable through the current connector. |
| [Qwen3-Coder-Next](https://huggingface.co/Qwen/Qwen3-Coder-Next) | Apache-2.0, text-generation, 79.7B parameters, updated February 2026, and listed inference providers. | Candidate only; not callable through the current connector. |
| [Qwen2.5-Coder-32B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct) | Apache-2.0, text-generation/code tags, 32.8B parameters, and listed inference providers. | Fallback candidate only; not callable through the current connector. |

> Model-card metadata establishes availability and license context, **not** Solana/Anchor correctness or production suitability.

## Qualification requirements

A candidate requires all of the following before use in a project-level routing rule:

1. The connector must invoke a version-pinned inference endpoint and document retention, rate limits, tool/file support, failure semantics, and license requirements.
2. The candidate must pass the held-out benchmark pack: Anchor account/PDA/owner/mint validation; checked 15/85 arithmetic; remaining-account and CPI substitution attacks; manifest byte mismatch; stale-slot rejection; TypeScript v0/ALT review; Rust repair; and route threat model.
3. It must achieve 100% security-negative-test explanation/rejection, at least 90% deterministic test/compilation success, no unresolved high/critical reviewer defect, and reproducible trial records.
4. Material model, connector, Anchor, Solana, Jupiter, or Jito change triggers requalification.

## Candidate order after connector capability exists

1. `Qwen/Qwen3-Coder-480B-A35B-Instruct` for primary high-capability coding review.
2. `Qwen/Qwen3-Coder-Next` for lower-latency independent coding/review routing.
3. `Qwen/Qwen2.5-Coder-32B-Instruct` only as explicit fallback.

This ranking is a candidate shortlist, not a factual assertion that any model is best for this protocol. Qualification evidence overrides model-card claims.
