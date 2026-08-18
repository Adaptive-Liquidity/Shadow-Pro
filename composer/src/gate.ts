import { checkedProfitSplit, manifestHash } from './canonical.js';
import { sourceLockAllowsExecution } from './source-lock.js';
import type {
  DecodedInstruction,
  DecodedTransaction,
  GateDecision,
  GatePolicy,
  TransactionManifest,
} from './types.js';

const REQUIRED_CLASSIFIERS: Record<DecodedTransaction['role'], readonly DecodedInstruction['classifier'][]> = {
  execute_flash_route: [
    'compute_budget',
    'dontfront',
    'paymaster_begin',
    'flash_borrow',
    'flash_repay',
    'paymaster_finalize',
  ],
  distribute_profit: ['distribute'],
  treasury_settle_and_tip: ['treasury_settle', 'jito_tip'],
};

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const SYSTEM_TRANSFER_INSTRUCTION = 2;

const ALLOWED_CLASSIFIERS: Record<DecodedTransaction['role'], readonly DecodedInstruction['classifier'][]> = {
  execute_flash_route: [...REQUIRED_CLASSIFIERS.execute_flash_route, 'route'],
  distribute_profit: REQUIRED_CLASSIFIERS.distribute_profit,
  treasury_settle_and_tip: REQUIRED_CLASSIFIERS.treasury_settle_and_tip,
};

function reject(code: string, detail: string): GateDecision {
  return { allowed: false, code, detail };
}

function exactRoles(transactions: readonly DecodedTransaction[]): boolean {
  return transactions.length === 3 && transactions.every((transaction, index) => {
    return transaction.index === index && transaction.role === ['execute_flash_route', 'distribute_profit', 'treasury_settle_and_tip'][index];
  });
}

function occursExactlyOnce(classes: readonly DecodedInstruction['classifier'][], classifier: DecodedInstruction['classifier']): boolean {
  return classes.filter((value) => value === classifier).length === 1;
}

function hasCanonicalExecutionSequence(instructions: readonly DecodedInstruction[]): boolean {
  const classes = instructions.map((instruction) => instruction.classifier);
  const requiredOnce: readonly DecodedInstruction['classifier'][] = [
    'compute_budget',
    'dontfront',
    'paymaster_begin',
    'flash_borrow',
    'flash_repay',
    'paymaster_finalize',
  ];
  if (!requiredOnce.every((classifier) => occursExactlyOnce(classes, classifier))) return false;
  if (classes[0] !== 'compute_budget' || classes[1] !== 'dontfront') return false;

  const begin = classes.indexOf('paymaster_begin');
  const borrow = classes.indexOf('flash_borrow');
  const repay = classes.indexOf('flash_repay');
  const finalize = classes.indexOf('paymaster_finalize');
  const routeIndices = classes
    .map((classifier, index) => (classifier === 'route' ? index : -1))
    .filter((index) => index >= 0);

  return begin === 2
    && borrow === begin + 1
    && routeIndices.length > 0
    && routeIndices.every((index) => index > borrow && index < repay)
    && repay > borrow
    && finalize === repay + 1
    && finalize === classes.length - 1;
}

function hasRequiredClassifiers(transaction: DecodedTransaction): boolean {
  const classes = transaction.instructions.map((instruction) => instruction.classifier);
  if (!classes.every((classifier) => ALLOWED_CLASSIFIERS[transaction.role].includes(classifier))) return false;
  if (transaction.role === 'execute_flash_route') return hasCanonicalExecutionSequence(transaction.instructions);
  if (transaction.role === 'distribute_profit') return classes.length === 1 && classes[0] === 'distribute';
  return classes.length === 2 && classes[0] === 'treasury_settle' && classes[1] === 'jito_tip';
}

function decodeBoundedJitoTip(
  transaction: DecodedTransaction,
  policy: GatePolicy,
  manifest: TransactionManifest,
): GateDecision | undefined {
  const tipInstruction = transaction.instructions[1];
  if (!tipInstruction || tipInstruction.classifier !== 'jito_tip') {
    return reject('JITO_TIP_TOPOLOGY_INVALID', 'TX-3 must end with exactly one Jito tip instruction.');
  }
  if (tipInstruction.programId !== SYSTEM_PROGRAM_ID || tipInstruction.accountIndices.length !== 2 || !tipInstruction.dataBase64) {
    return reject('JITO_TIP_BINDING_INVALID', 'Jito tip must be a canonical two-account System Program transfer.');
  }

  let data: Buffer;
  try {
    data = Buffer.from(tipInstruction.dataBase64, 'base64');
  } catch {
    return reject('JITO_TIP_BINDING_INVALID', 'Jito tip transfer data is not decodable base64.');
  }
  if (data.toString('base64') !== tipInstruction.dataBase64 || data.length !== 12 || data.readUInt32LE(0) !== SYSTEM_TRANSFER_INSTRUCTION) {
    return reject('JITO_TIP_BINDING_INVALID', 'Jito tip must use the canonical System Program transfer encoding.');
  }
  const tipLamports = data.readBigUInt64LE(4);
  if (tipLamports === 0n || tipLamports > manifest.risk.maxTipLamports) {
    return reject('JITO_TIP_CAP_EXCEEDED', 'Decoded Jito tip amount is zero or exceeds the manifest cap.');
  }

  const payer = transaction.accountMetas[tipInstruction.accountIndices[0]!];
  const recipient = transaction.accountMetas[tipInstruction.accountIndices[1]!];
  if (
    !payer
    || !recipient
    || payer.pubkey !== policy.paymasterFeePayer
    || !payer.isSigner
    || !payer.isWritable
    || payer.ownerProgram !== SYSTEM_PROGRAM_ID
    || recipient.pubkey !== manifest.settlement.tipAccount
    || recipient.isSigner
    || !recipient.isWritable
    || recipient.ownerProgram !== SYSTEM_PROGRAM_ID
  ) {
    return reject('JITO_TIP_BINDING_INVALID', 'Jito tip account metas do not bind the expected payer and verified recipient.');
  }
  return undefined;
}

function transactionIsolationError(transaction: DecodedTransaction): GateDecision | undefined {
  if (transaction.index === 0) return undefined;
  if (transaction.instructions.some((instruction) => instruction.classifier === 'route')) {
    return reject('ROUTE_OUTSIDE_TX1', 'Route instructions are permitted only in the atomic flash-loan transaction.');
  }
  if (transaction.instructions.some((instruction) => instruction.classifier === 'flash_borrow' || instruction.classifier === 'flash_repay')) {
    return reject('FLASH_INSTRUCTION_OUTSIDE_TX1', 'Flash-loan borrow and repayment are permitted only in TX-1.');
  }
  return undefined;
}

function hasOnlyAllowedPrograms(transaction: DecodedTransaction, policy: GatePolicy): boolean {
  return transaction.instructions.every((instruction) => policy.allowedProgramIds.has(instruction.programId));
}

function hasOnlyAllowedAccounts(transaction: DecodedTransaction, policy: GatePolicy): boolean {
  return transaction.addressLookupTables.every((table) => policy.allowedAddressLookupTables.has(table))
    && transaction.accountMetas.every((meta) => policy.allowedProgramIds.has(meta.ownerProgram));
}

function computePriorityFeeLamports(transaction: DecodedTransaction): bigint {
  return (transaction.computeUnitLimit * transaction.computeUnitPriceMicroLamports) / 1_000_000n;
}

function validateSignerGraph(transaction: DecodedTransaction, policy: GatePolicy): GateDecision | undefined {
  if (transaction.feePayer !== policy.paymasterFeePayer) {
    return reject('FEE_PAYER_MISMATCH', 'The agent or another account cannot be the protected transaction fee payer.');
  }
  const agentSigner = transaction.requiredSigners.find((signer) => signer.role === 'agent_intent');
  const paymasterSigner = transaction.requiredSigners.find((signer) => signer.role === 'paymaster_fee_payer');
  if (agentSigner?.pubkey !== policy.agentPubkey || paymasterSigner?.pubkey !== policy.paymasterFeePayer) {
    return reject('SIGNER_GRAPH_INVALID', 'Required signer roles do not match the source-locked agent and paymaster keys.');
  }
  return undefined;
}

export function validateManifest(manifest: TransactionManifest, policy: GatePolicy): GateDecision {
  if (policy.protocolPaused) return reject('PROTOCOL_PAUSED', 'The active policy is paused.');
  if (!sourceLockAllowsExecution(policy.sourceLock, policy.requiredSourceLockEntries)) {
    return reject('SOURCE_LOCK_BLOCKED', 'A dependency remains blocked, malformed, missing, or unpinned.');
  }
  if (manifest.policyHash !== policy.policyHash) return reject('POLICY_HASH_MISMATCH', 'Manifest policy does not equal active policy.');
  if (policy.activeNonceSet.has(manifest.approvalNonce)) return reject('NONCE_REUSED', 'Approval nonce is already active or consumed.');
  if (!exactRoles(manifest.transactions)) return reject('TOPOLOGY_INVALID', 'Bundle must contain exactly the canonical three transactions.');
  if (manifest.settlement.profitMint !== policy.allowedProfitMint) return reject('PROFIT_MINT_DENIED', 'Settlement mint is not source-locked.');
  if (manifest.settlement.paymasterDestination !== policy.paymasterDestination || manifest.settlement.treasuryDestination !== policy.treasuryDestination) {
    return reject('DESTINATION_DENIED', 'Settlement destination differs from source-locked policy.');
  }
  if (!policy.currentJitoTipAccounts.has(manifest.settlement.tipAccount)) {
    return reject('TIP_ACCOUNT_DENIED', 'Jito tip recipient is not in the current verified account set.');
  }

  let totalPriorityFee = 0n;
  for (const transaction of manifest.transactions) {
    if (transaction.expirySlot <= policy.currentSlot) return reject('EXPIRED', `Transaction ${transaction.index} has expired.`);
    if (transaction.computeUnitLimit > policy.maxComputeUnitLimit) return reject('COMPUTE_LIMIT_EXCEEDED', `Transaction ${transaction.index} exceeds compute limit.`);
    const isolationError = transactionIsolationError(transaction);
    if (isolationError) return isolationError;
    if (!hasRequiredClassifiers(transaction)) {
      const hasUnexpectedClass = transaction.instructions.some((instruction) => !ALLOWED_CLASSIFIERS[transaction.role].includes(instruction.classifier));
      return reject(
        hasUnexpectedClass ? 'UNEXPECTED_INSTRUCTION_CLASSIFIER' : 'INSTRUCTION_TOPOLOGY_INVALID',
        `Transaction ${transaction.index} violates required classifier order or scope.`,
      );
    }
    if (!hasOnlyAllowedPrograms(transaction, policy)) return reject('PROGRAM_DENIED', `Transaction ${transaction.index} contains an unapproved program.`);
    if (!hasOnlyAllowedAccounts(transaction, policy)) return reject('ACCOUNT_OR_ALT_DENIED', `Transaction ${transaction.index} contains an unapproved account owner or lookup table.`);
    const signerError = validateSignerGraph(transaction, policy);
    if (signerError) return signerError;
    if (transaction.role === 'treasury_settle_and_tip') {
      const tipError = decodeBoundedJitoTip(transaction, policy, manifest);
      if (tipError) return tipError;
    }
    totalPriorityFee += computePriorityFeeLamports(transaction);
  }

  const tx0 = manifest.transactions[0];
  if (!tx0.instructions.some((instruction) => instruction.classifier === 'dontfront')) {
    return reject('DONTFRONT_MISSING', 'TX-1 must include the Jito DontFront marker.');
  }
  if (manifest.simulation.simulationSlot + manifest.risk.maxSlotDelta < policy.currentSlot) {
    return reject('SIMULATION_STALE', 'Simulation slot exceeds maximum permitted drift.');
  }
  if (manifest.transactions.some((transaction, index) => manifest.simulation.messageHashes[index] !== transaction.messageHash)) {
    return reject('SIMULATION_MESSAGE_MISMATCH', 'Simulation receipt does not bind the exact transaction messages.');
  }
  if (totalPriorityFee > manifest.risk.maxPriorityFeeLamports) return reject('PRIORITY_FEE_CAP_EXCEEDED', 'Decoded priority fee exceeds manifest cap.');
  if (manifest.risk.maxBaseFeeLamports + totalPriorityFee + manifest.risk.maxTipLamports > manifest.risk.maxTotalFeeExposureLamports) {
    return reject('TOTAL_FEE_CAP_EXCEEDED', 'Maximum base, priority, and tip exposure exceeds cap.');
  }

  try {
    const split = checkedProfitSplit(
      manifest.simulation.postVaultBalance,
      manifest.simulation.preVaultBalance,
      manifest.simulation.repaymentObligations,
      manifest.risk.minimumNetProfit.atomicUnits,
    );
    if (split.paymasterShare + split.treasuryShare !== split.eligibleProfit) {
      return reject('PROFIT_SPLIT_INVARIANT_FAILED', 'Profit split does not conserve eligible profit.');
    }
  } catch (error) {
    return reject('NET_PROFIT_INSUFFICIENT', error instanceof Error ? error.message : 'Profit calculation failed.');
  }

  return {
    allowed: true,
    code: 'ALLOW',
    detail: 'Manifest satisfies deterministic topology, policy, freshness, fee, and profit controls.',
    manifestHash: manifestHash(manifest as unknown as Record<string, unknown>),
  };
}
