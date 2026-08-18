# Shadow-Pro Security Engineering Playbooks

These playbooks are procedural memory. They do not authorize code execution, source-lock changes, deployment, funding, signing, transaction submission, or public-network activity.

## 1. Anchor account-security review

Identify every instruction, signer, writable account, owner/mint/address constraint, PDA, token program, and state mutation. For each account, prove why it is present, why it is writable or a signer, and which configuration/state field binds it. Test substitute accounts with the same mint/authority, wrong mint, wrong token program, wrong PDA, wrong owner, wrong writable/signature bit, and stale state.

**Exit evidence:** account matrix, negative tests, current-SHA review record, and no unexplained `UncheckedAccount` or `AccountInfo` use.

## 2. PDA and seed review

List every PDA with its seed domain separator, dynamic identifiers, bump source, authority use, and close/reinitialization exposure. Verify each PDA is derived canonically and cannot be confused across config, settlement, user, mint, or nonce domains.

**Exit evidence:** seed inventory, bump test cases, collision/replay tests, and source constraints linked to every PDA authority.

## 3. CPI and remaining-account review

List every CPI, target program, instruction type, account list, signer seed, and writable account. Reject arbitrary CPI program IDs, remaining-account forwarding, token-program ambiguity, instruction-data substitution, and privilege escalation.

**Exit evidence:** CPI inventory, exact target/address constraints, account-meta tests, and no undocumented `remaining_accounts` use.

## 4. SPL Token and Token-2022 review

For every transfer, bind source, destination, mint, token program, authority, decimals, and close/freeze assumptions. Prefer `transfer_checked`; test same-authority substitute vaults, same-mint destination substitution, Token-2022 mismatch, source=destination, mint authority/freeze authority, and balance conservation.

**Exit evidence:** token matrix, substitution negative tests, checked transfer evidence, and deterministic balance-delta assertions.

## 5. Transaction and ALT decoding review

Decode the exact versioned message. Bind fee payer, required signers, program IDs, discriminators, bytes, accounts, account order, signer/writable bits, lookup tables, compute budget, recent blockhash/expiry, nonce, and all transfer destinations/amounts. Reject any unrecognized instruction, ALT, account meta, or byte mismatch.

**Exit evidence:** positive fixture, mutation corpus, canonical message hash, ALT/account-meta rejection tests, and exact-byte simulation binding.

## 6. Source-lock qualification

A source lock may change only after a first-party immutable source, retrieval date, hash, program/endpoint identifier, decoder, account matrix, positive and negative fixtures, integration-failure semantics, independent review, rollback method, and human approval are recorded. Unknown/missing/duplicate lock entries fail closed.

**Exit evidence:** source artifact hash, lock schema validation, decoder diff, fixtures, reviewer record, and no mutable caller bypass.

## 7. Remote signer qualification

Use no provider until a test-only, unfunded identity is separately approved. Verify exact serialized-message bytes, expected public key, signature, nonce, manifest/policy hash, expiry, idempotency, duplicate requests, timeout/retry behavior, provider mutation, p99 latency, audit logs, and no raw-key exposure.

**Exit evidence:** provider-neutral golden vector results, cryptographic verification logs, latency record, breaker behavior, and explicit human approval.

## 8. Jito relay qualification

Verify exact endpoint, authentication boundary, bundle ordering/all-or-nothing semantics, dynamic tip-account retrieval, tip-recipient and amount binding, DontFront placement, acknowledgement versus landing, chain reconciliation, expiry, duplicate handling, no blind retry, and no public fallback.

**Exit evidence:** immutable endpoint evidence, read-only status/tip observations, typed adapter tests, failure/status matrix, and human approval before any submission.

## 9. Devnet-readiness review

Ensure configuration remains deny-by-default. Pin candidate SHA, artifact/IDL/config/source-lock hashes, test-only public identifiers, scope, fee/transaction caps, stop conditions, zero-agent-SOL proof, and expiration. Review all read-only preflight evidence before requesting a state-changing action.

**Exit evidence:** signed-off approval template, preflight snapshot, approved test scope, and human authorization. This playbook itself does not authorize any action.

## 10. Release signoff

Require immutable source/build/IDL hashes, source-lock state, independent audit status, threat-model status, known findings, monitoring/incident/rollback plan, custody/governance confirmation, and named approvals. A release tag must originate from a reviewed commit.

**Exit evidence:** release evidence matrix and human signoff. Mainnet is prohibited while any hard block remains.

## 11. Security incident and rollback

Freeze the affected SHA/config/lock evidence; pause/revoke only through separately approved operational authority; preserve logs and hashes; classify impact; prepare a minimal rollback/recovery plan; retest before unpausing. Do not erase memory or rewrite history.

**Exit evidence:** incident record, artifact/config/lock references, blast-radius assessment, corrective tests, and closure approval.

## 12. Dependency upgrade

Use a dedicated PR. Pin source/version/checksum, enumerate affected Rust/JS/CI surface, generate SBOM delta, run relevant tests/linters/audits, examine advisories and license changes, and update the artifact evidence. No dependency change may piggyback on security logic.

**Exit evidence:** lockfile diff review, audit results, SBOM delta, tests, and code-owner approval.

## 13. CI failure diagnosis

Pin run ID and SHA, identify the exact failing command, reproduce in an equivalent isolated environment, classify environment/test/source/configuration fault, make the smallest fix, add a regression check, and rerun all affected jobs. Never weaken a CI rule merely to obtain green status.

**Exit evidence:** failure log reference, root cause, fix SHA, regression test, passing rerun, and residual risk.

## 14. Fuzz, property, and mutation testing

Define properties before generating inputs: account/authority binding, state transition validity, arithmetic conservation, canonical decoding, source-lock fail-closed behavior, exact receipt binding, expiry/replay protection, and no agent funding. Seed reproducible corpora. Treat surviving mutants or property counterexamples as findings until adjudicated.

**Exit evidence:** tool/version, deterministic seed, corpus/replay command, counterexample record, mutation score, and current-SHA result.
