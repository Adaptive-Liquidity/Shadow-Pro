# Model-Assisted Review Protocol

Models are non-authoritative development reviewers. They never receive production credentials, private keys, live signed transactions, funded-wallet data, or undisclosed customer information. They cannot approve manifests, select trade parameters, request a signature, activate a relay, or submit a transaction.

| Review lane | Intended system | Input artifact | Required output | Independent adjudication |
|---|---|---|---|---|
| Rust/Anchor exploit review | OpenAI strong GPT candidate from live catalog | Reviewed source diff, account matrix, tests, and source-lock entry. | Structured findings: invariant, exploit preconditions, severity, source reference, minimal regression test. | Gemini review plus deterministic test/reproduction. |
| Integration reconciliation | Gemini long-context candidate from live catalog | Jupiter/Jito docs, immutable IDL/artifact, observed decoder output, and source-lock proposal. | Field-by-field discrepancy table with unknowns explicitly marked. | Human source review and decoder comparison. |
| Coding-model benchmark | Hugging Face Qwen candidate when inference capability exists | Held-out sanitized Solana benchmark only. | Patch plus explanation; no secrets or production artifacts. | Compile/test result and independent OpenAI/Gemini review. |
| Threat-model challenge | OpenAI and Gemini, independently | Threat model and reviewed diff. | Attack tree, ignored assumptions, test gaps, and evidence citations. | Human security review; no majority vote. |

## Evidence record

Each model-assisted change needs a record with exact provider/model ID, connector/API version, UTC timestamp, sanitized prompt hash, output hash/location, review scope, independent reviewer, source artifacts, tests run, accepted/rejected findings, and residual risks. Use the repository’s model-assisted-change template to link this record.

## Current capability status

The connected Hugging Face capability supports repository/model-card discovery but not model inference. Qwen coding generation is therefore blocked rather than simulated. The workspace has not yet queried a live OpenAI/Gemini catalog or invoked either provider for this repository change; any future call must first confirm the live model ID and record the invocation under this protocol.
