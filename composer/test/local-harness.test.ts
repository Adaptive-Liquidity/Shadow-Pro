import { describe, expect, it } from 'vitest';
import { executeLocalProtectedBundle, type LocalLedger } from '../src/local-harness.js';
import type { GatePolicy, TransactionManifest } from '../src/types.js';

const AGENT = 'Agent111111111111111111111111111111111111111';
const PAYMASTER = 'Paymast111111111111111111111111111111111111';
const PAYMASTER_PROGRAM = 'Paymstr11111111111111111111111111111111111';
const FLASH_PROGRAM = 'jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const COMPUTE_PROGRAM = 'ComputeBudget111111111111111111111111111111';
const DONTFRONT_PROGRAM = 'jitodontfront111111111111111111111111111111';
const PROFIT_MINT = 'USDC11111111111111111111111111111111111111';
const PAYMASTER_DESTINATION = 'PayDest111111111111111111111111111111111';
const TREASURY_DESTINATION = 'Treasury111111111111111111111111111111111';
const TIP_ACCOUNT = 'TipAcct1111111111111111111111111111111111';
const ALT = 'Lookup1111111111111111111111111111111111111';

function ix(ordinal: number, classifier: TransactionManifest['transactions'][number]['instructions'][number]['classifier'], programId: string) {
  return { ordinal, classifier, programId, dataHash: 'a'.repeat(64), accountIndices: [] };
}

function makeManifest(): TransactionManifest {
  const tx = (index: 0 | 1 | 2, role: TransactionManifest['transactions'][number]['role'], instructions: TransactionManifest['transactions'][number]['instructions']) => ({
    index,
    role,
    serializedMessageBase64: Buffer.from(`local-message-${index}`).toString('base64'),
    messageHash: `${index + 1}`.repeat(64),
    recentBlockhash: `LocalBlockhash${index}`,
    expirySlot: 110n,
    feePayer: PAYMASTER,
    requiredSigners: [{ pubkey: AGENT, role: 'agent_intent' as const }, { pubkey: PAYMASTER, role: 'paymaster_fee_payer' as const }],
    instructions,
    accountMetas: [{ pubkey: PAYMASTER, isSigner: true, isWritable: true, ownerProgram: SYSTEM_PROGRAM }],
    addressLookupTables: [ALT],
    computeUnitLimit: 200_000n,
    computeUnitPriceMicroLamports: 100n,
  });
  const tx0 = tx(0, 'execute_flash_route', [
    ix(0, 'compute_budget', COMPUTE_PROGRAM), ix(1, 'dontfront', DONTFRONT_PROGRAM), ix(2, 'paymaster_begin', PAYMASTER_PROGRAM),
    ix(3, 'flash_borrow', FLASH_PROGRAM), ix(4, 'route', FLASH_PROGRAM), ix(5, 'flash_repay', FLASH_PROGRAM), ix(6, 'paymaster_finalize', PAYMASTER_PROGRAM),
  ]);
  const tx1 = tx(1, 'distribute_profit', [ix(0, 'distribute', PAYMASTER_PROGRAM)]);
  const tx2 = tx(2, 'treasury_settle_and_tip', [ix(0, 'treasury_settle', PAYMASTER_PROGRAM), ix(1, 'jito_tip', SYSTEM_PROGRAM)]);
  return {
    schemaVersion: '1.1', manifestId: '00000000-0000-7000-8000-000000000002', approvalNonce: 'l'.repeat(64), policyHash: 'p'.repeat(64), createdAt: '2026-08-16T00:00:00.000Z',
    simulation: { endpointId: 'local-fixture', simulationSlot: 99n, completedAt: '2026-08-16T00:00:00.000Z', receiptHash: 'r'.repeat(64), messageHashes: [tx0.messageHash, tx1.messageHash, tx2.messageHash], preVaultBalance: 1_000_000n, postVaultBalance: 1_020_000n, repaymentObligations: 5_000n, unitsConsumed: [100_000n, 20_000n, 20_000n] },
    risk: { maxBaseFeeLamports: 20_000n, maxPriorityFeeLamports: 1_000n, maxTipLamports: 500n, maxTotalFeeExposureLamports: 21_500n, slippageBps: 50, minimumNetProfit: { mint: PROFIT_MINT, atomicUnits: 10_000n }, maxSlotDelta: 2n },
    transactions: [tx0, tx1, tx2],
    settlement: { settlementPda: 'Settlement111111111111111111111111111111111', profitMint: PROFIT_MINT, paymasterBps: 1500, treasuryBps: 8500, paymasterDestination: PAYMASTER_DESTINATION, treasuryDestination: TREASURY_DESTINATION, tipAccount: TIP_ACCOUNT },
  };
}

function makePolicy(): GatePolicy {
  return {
    policyHash: 'p'.repeat(64), agentPubkey: AGENT, paymasterFeePayer: PAYMASTER,
    allowedProgramIds: new Set([PAYMASTER_PROGRAM, FLASH_PROGRAM, SYSTEM_PROGRAM, COMPUTE_PROGRAM, DONTFRONT_PROGRAM]),
    allowedAddressLookupTables: new Set([ALT]), currentJitoTipAccounts: new Set([TIP_ACCOUNT]), allowedProfitMint: PROFIT_MINT,
    paymasterDestination: PAYMASTER_DESTINATION, treasuryDestination: TREASURY_DESTINATION, maxComputeUnitLimit: 500_000n,
    currentSlot: 100n, activeNonceSet: new Set(), sourceLockAllowsExecution: true, protocolPaused: false,
  };
}

function makeLedger(): LocalLedger {
  return { agentLamports: 0n, paymasterFeePayerLamports: 50_000n, profitVaultTokens: 1_000_000n, paymasterDestinationTokens: 0n, treasuryDestinationTokens: 0n, jitoTipRecipientLamports: 0n };
}

describe('local protected-bundle harness', () => {
  it('settles the valid local-only fixture without funding the agent', () => {
    const result = executeLocalProtectedBundle(makeManifest(), makePolicy(), makeLedger());
    expect(result.decision).toMatchObject({ allowed: true, code: 'ALLOW' });
    expect(result.ledger).toEqual({ agentLamports: 0n, paymasterFeePayerLamports: 28_500n, profitVaultTokens: 1_005_000n, paymasterDestinationTokens: 2_250n, treasuryDestinationTokens: 12_750n, jitoTipRecipientLamports: 500n });
  });

  it('rejects any positive agent SOL balance before admission', () => {
    const ledger = makeLedger();
    ledger.agentLamports = 1n;
    expect(executeLocalProtectedBundle(makeManifest(), makePolicy(), ledger).decision.code).toBe('AGENT_CAPITAL_INVARIANT_BREACH');
  });

  it('rejects an underfunded paymaster fee payer after exact manifest admission', () => {
    const ledger = makeLedger();
    ledger.paymasterFeePayerLamports = 21_499n;
    expect(executeLocalProtectedBundle(makeManifest(), makePolicy(), ledger).decision.code).toBe('LOCAL_PAYMASTER_FEE_SHORTFALL');
  });
});
