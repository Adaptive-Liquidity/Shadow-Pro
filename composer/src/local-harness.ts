import { checkedProfitSplit } from './canonical.js';
import { validateManifest } from './gate.js';
import type { GateDecision, GatePolicy, TransactionManifest } from './types.js';

export interface LocalLedger {
  agentLamports: bigint;
  paymasterFeePayerLamports: bigint;
  profitVaultTokens: bigint;
  paymasterDestinationTokens: bigint;
  treasuryDestinationTokens: bigint;
  jitoTipRecipientLamports: bigint;
}

export interface LocalBundleResult {
  decision: GateDecision;
  ledger?: LocalLedger;
  paymasterShare?: bigint;
  treasuryShare?: bigint;
}

export function executeLocalProtectedBundle(
  manifest: TransactionManifest,
  policy: GatePolicy,
  startingLedger: LocalLedger,
): LocalBundleResult {
  if (startingLedger.agentLamports !== 0n) {
    return {
      decision: {
        allowed: false,
        code: 'AGENT_CAPITAL_INVARIANT_BREACH',
        detail: 'The agent must have exactly zero lamports before protected-bundle admission.',
      },
    };
  }

  const decision = validateManifest(manifest, policy);
  if (!decision.allowed) return { decision };

  if (startingLedger.profitVaultTokens !== manifest.simulation.preVaultBalance) {
    return {
      decision: {
        allowed: false,
        code: 'LOCAL_PRE_BALANCE_MISMATCH',
        detail: 'Local vault does not equal the bound pre-simulation balance.',
      },
    };
  }

  let split;
  try {
    split = checkedProfitSplit(
      manifest.simulation.postVaultBalance,
      manifest.simulation.preVaultBalance,
      manifest.simulation.repaymentObligations,
      manifest.risk.minimumNetProfit.atomicUnits,
    );
  } catch (error) {
    return {
      decision: {
        allowed: false,
        code: 'LOCAL_SETTLEMENT_REJECTED',
        detail: error instanceof Error ? error.message : 'Local settlement calculation failed.',
      },
    };
  }

  const postSettlementVault = manifest.simulation.postVaultBalance - split.paymasterShare - split.treasuryShare;
  const expectedResidual = manifest.simulation.preVaultBalance + manifest.simulation.repaymentObligations;
  if (postSettlementVault !== expectedResidual) {
    return {
      decision: {
        allowed: false,
        code: 'LOCAL_CONSERVATION_FAILURE',
        detail: 'Post-settlement vault balance does not conserve principal and obligations.',
      },
    };
  }

  const nextLedger: LocalLedger = {
    agentLamports: 0n,
    paymasterFeePayerLamports: startingLedger.paymasterFeePayerLamports - manifest.risk.maxBaseFeeLamports - manifest.risk.maxPriorityFeeLamports - manifest.risk.maxTipLamports,
    profitVaultTokens: postSettlementVault,
    paymasterDestinationTokens: startingLedger.paymasterDestinationTokens + split.paymasterShare,
    treasuryDestinationTokens: startingLedger.treasuryDestinationTokens + split.treasuryShare,
    jitoTipRecipientLamports: startingLedger.jitoTipRecipientLamports + manifest.risk.maxTipLamports,
  };

  if (nextLedger.paymasterFeePayerLamports < 0n) {
    return {
      decision: {
        allowed: false,
        code: 'LOCAL_PAYMASTER_FEE_SHORTFALL',
        detail: 'The paymaster fee payer cannot cover the maximum decoded fee and tip exposure.',
      },
    };
  }

  return {
    decision,
    ledger: nextLedger,
    paymasterShare: split.paymasterShare,
    treasuryShare: split.treasuryShare,
  };
}
