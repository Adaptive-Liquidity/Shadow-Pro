#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SHA="$(git rev-parse HEAD)"
MEMORY="python3 scripts/manus_memory.py"
SCOPE="Shadow Account Protocol / Adaptive-Liquidity/Shadow-Pro"

$MEMORY add --kind fact --title "Canonical source lock remains blocked" --body "At the current candidate, config/sources.lock.json marks Shadow Paymaster local-only and marks Jupiter Flashloan and Jito Block Engine blocked." --scope "$SCOPE" --commit "$SHA" --provenance "config/sources.lock.json static review" --confidence 1.0 --status verified --freshness-days 30 --importance 5 --metadata '{"path":"config/sources.lock.json","classification":"fact"}'

$MEMORY add --kind fact --title "No execution capability is authorized" --body "The candidate repository contains deny-by-default execution controls and no approved deployment, funding, signing, remote signer, transaction submission, bundle submission, or source-lock enablement." --scope "$SCOPE" --commit "$SHA" --provenance "README.md, config/devnet-readiness.template.json, source lock, static review" --confidence 1.0 --status verified --freshness-days 30 --importance 5 --metadata '{"classification":"fact","risk":"critical"}'

$MEMORY add --kind fact --title "FinalizeSettlement vault-substitution finding" --body "FinalizeSettlement lacks address = config.profit_vault while calculating recorded shares from profit_vault.amount. A same-mint, vault-authority-controlled substitute can inflate recorded shares before later transfers from the real configured vault. This is a verified critical finding until fixed with regression evidence." --scope "$SCOPE" --commit "$SHA" --provenance "programs/shadow_paymaster/src/lib.rs static audit" --confidence 0.95 --status verified --freshness-days 7 --importance 5 --metadata '{"classification":"fact","severity":"critical","path":"programs/shadow_paymaster/src/lib.rs"}'

$MEMORY add --kind decision --title "Memory is advisory and evidence-bound" --body "Project-local memory may assist retrieval and retrospectives, but it cannot enable source locks, authorize deployments, sign, submit, choose trade parameters, or replace current source and human approval." --scope "$SCOPE" --commit "$SHA" --provenance ".manus/MEMORY_SYSTEM_SPEC.md and user-approved safety boundary" --confidence 1.0 --status verified --freshness-days 365 --importance 5 --metadata '{"classification":"decision","approval":"user instruction","reversal_conditions":"explicit human decision with security review"}'

$MEMORY add --kind artifact --title "Immutable Jupiter Flashloan IDL artifact" --body "The repository retains the Jupiter Flashloan IDL artifact with SHA-256 7fac42ff8320d70162f81c610cb985418a11ed8d40f09a0b2cc3809fc25ef4be. Retention does not enable the blocked Jupiter source lock." --scope "$SCOPE" --commit "$SHA" --provenance "evidence/jupiter-flashloan/artifacts/flashloan-33a22cf7a5bfdd32ab1712dda4adfbeb9b348ad9.json" --confidence 1.0 --status verified --freshness-days 365 --importance 4 --metadata '{"classification":"artifact","sha256":"7fac42ff8320d70162f81c610cb985418a11ed8d40f09a0b2cc3809fc25ef4be"}'

$MEMORY add --kind episode --title "Read-only audit of PR candidate" --body "Performed a static/read-only audit of the current PR candidate. Identified verified vault-substitution, source-lock-authority, topology, account-binding, parsing, and fake-relay findings. No project code, transaction, deployment, funding, signing, or external integration was executed." --scope "$SCOPE" --commit "$SHA" --provenance "Shadow_Pro_Read_Only_Audit_7474abb.md" --confidence 0.95 --status verified --freshness-days 30 --importance 5 --metadata '{"classification":"episode","tests_run":[],"network_execution":false,"residual_risk":"critical findings open"}'

$MEMORY export
