import { describe, expect, it } from 'vitest';
import { canonicalJson, checkedProfitSplit, manifestHash, parseAtomicUnits } from '../src/canonical.js';
import { validateManifest } from '../src/gate.js';
import type { SourceLock } from '../src/source-lock.js';
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

function systemTransferDataBase64(lamports: bigint): string {
  const data = Buffer.alloc(12);
  data.writeUInt32LE(2, 0);
  data.writeBigUInt64LE(lamports, 4);
  return data.toString('base64');
}

function instruction(
  ordinal: number,
  classifier: TransactionManifest['transactions'][number]['instructions'][number]['classifier'],
  programId: string,
  accountIndices: number[] = [],
  dataBase64?: string,
) {
  return { ordinal, classifier, programId, dataHash: 'a'.repeat(64), accountIndices, ...(dataBase64 ? { dataBase64 } : {}) };
}

function signerGraph() {
  return [
    { pubkey: AGENT, role: 'agent_intent' as const },
    { pubkey: PAYMASTER, role: 'paymaster_fee_payer' as const },
  ];
}

function transaction(
  index: 0 | 1 | 2,
  role: TransactionManifest['transactions'][number]['role'],
  instructions: TransactionManifest['transactions'][number]['instructions'],
) {
  return {
    index,
    role,
    serializedMessageBase64: Buffer.from(`message-${index}`).toString('base64'),
    messageHash: `${index + 1}`.repeat(64),
    recentBlockhash: `Blockhash${index}`,
    expirySlot: 110n,
    feePayer: PAYMASTER,
    requiredSigners: signerGraph(),
    instructions,
    accountMetas: role === 'treasury_settle_and_tip'
      ? [
        { pubkey: PAYMASTER, isSigner: true, isWritable: true, ownerProgram: SYSTEM_PROGRAM },
        { pubkey: TIP_ACCOUNT, isSigner: false, isWritable: true, ownerProgram: SYSTEM_PROGRAM },
      ]
      : [{ pubkey: PAYMASTER, isSigner: true, isWritable: true, ownerProgram: SYSTEM_PROGRAM }],
    addressLookupTables: [ALT],
    computeUnitLimit: 200_000n,
    computeUnitPriceMicroLamports: 100n,
  };
}

function pinnedExecutionLock(): SourceLock {
  return {
    lock_version: '1.0',
    generated_at_utc: '2026-08-18T00:00:00Z',
    entries: [
      {
        name: 'shadow-paymaster-program',
        kind: 'anchor-program',
        program_id: PAYMASTER_PROGRAM,
        idl_sha256: 'a'.repeat(64),
        status: 'pinned',
        implementation_gate: 'complete',
      },
      {
        name: 'jupiter-flashloan',
        kind: 'external-program',
        program_id: FLASH_PROGRAM,
        idl_sha256: 'b'.repeat(64),
        status: 'pinned',
        implementation_gate: 'complete',
      },
      {
        name: 'jito-block-engine',
        kind: 'relay',
        endpoint: 'https://relay.example',
        status: 'pinned',
        implementation_gate: 'complete',
      },
    ],
  };
}

function policy(): GatePolicy {
  return {
    policyHash: 'p'.repeat(64),
    agentPubkey: AGENT,
    paymasterFeePayer: PAYMASTER,
    allowedProgramIds: new Set([PAYMASTER_PROGRAM, FLASH_PROGRAM, SYSTEM_PROGRAM, COMPUTE_PROGRAM, DONTFRONT_PROGRAM]),
    allowedAddressLookupTables: new Set([ALT]),
    currentJitoTipAccounts: new Set([TIP_ACCOUNT]),
    allowedProfitMint: PROFIT_MINT,
    paymasterDestination: PAYMASTER_DESTINATION,
    treasuryDestination: TREASURY_DESTINATION,
    maxComputeUnitLimit: 500_000n,
    currentSlot: 100n,
    activeNonceSet: new Set(),
    sourceLock: pinnedExecutionLock(),
    requiredSourceLockEntries: ['shadow-paymaster-program', 'jupiter-flashloan', 'jito-block-engine'],
    protocolPaused: false,
  };
}

function manifest(): TransactionManifest {
  const tx0 = transaction(0, 'execute_flash_route', [
    instruction(0, 'compute_budget', COMPUTE_PROGRAM),
    instruction(1, 'dontfront', DONTFRONT_PROGRAM),
    instruction(2, 'paymaster_begin', PAYMASTER_PROGRAM),
    instruction(3, 'flash_borrow', FLASH_PROGRAM),
    instruction(4, 'route', FLASH_PROGRAM),
    instruction(5, 'flash_repay', FLASH_PROGRAM),
    instruction(6, 'paymaster_finalize', PAYMASTER_PROGRAM),
  ]);
  const tx1 = transaction(1, 'distribute_profit', [instruction(0, 'distribute', PAYMASTER_PROGRAM)]);
  const tx2 = transaction(2, 'treasury_settle_and_tip', [
    instruction(0, 'treasury_settle', PAYMASTER_PROGRAM),
    instruction(1, 'jito_tip', SYSTEM_PROGRAM, [0, 1], systemTransferDataBase64(500n)),
  ]);
  return {
    schemaVersion: '1.1',
    manifestId: '00000000-0000-7000-8000-000000000001',
    approvalNonce: 'n'.repeat(64),
    policyHash: 'p'.repeat(64),
    createdAt: '2026-08-16T00:00:00.000Z',
    simulation: {
      endpointId: 'fixture-rpc',
      simulationSlot: 99n,
      completedAt: '2026-08-16T00:00:00.000Z',
      receiptHash: 'r'.repeat(64),
      messageHashes: [tx0.messageHash, tx1.messageHash, tx2.messageHash],
      preVaultBalance: 1_000_000n,
      postVaultBalance: 1_020_000n,
      repaymentObligations: 5_000n,
      unitsConsumed: [100_000n, 30_000n, 30_000n],
    },
    risk: {
      maxBaseFeeLamports: 20_000n,
      maxPriorityFeeLamports: 1_000n,
      maxTipLamports: 500n,
      maxTotalFeeExposureLamports: 21_500n,
      slippageBps: 50,
      minimumNetProfit: { mint: PROFIT_MINT, atomicUnits: 10_000n },
      maxSlotDelta: 2n,
    },
    transactions: [tx0, tx1, tx2],
    settlement: {
      settlementPda: 'Settlement111111111111111111111111111111111',
      profitMint: PROFIT_MINT,
      paymasterBps: 1500,
      treasuryBps: 8500,
      paymasterDestination: PAYMASTER_DESTINATION,
      treasuryDestination: TREASURY_DESTINATION,
      tipAccount: TIP_ACCOUNT,
    },
  };
}

describe('canonical approval controls', () => {
  it('creates a stable hash independent of object insertion order', () => {
    const left = { b: '2', a: '1' };
    const right = { a: '1', b: '2' };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(manifestHash(left)).toBe(manifestHash(right));
  });

  it('rejects JSON numbers in a canonical manifest', () => {
    expect(() => canonicalJson({ unsafe: 1 })).toThrow('forbid JSON numbers');
  });

  it('uses exact 15/85 integer split with the treasury as remainder', () => {
    expect(checkedProfitSplit(1_020_000n, 1_000_000n, 5_000n, 10_000n)).toEqual({
      eligibleProfit: 15_000n,
      paymasterShare: 2_250n,
      treasuryShare: 12_750n,
    });
  });

  it('accepts the maximum u64 atomic amount and rejects the next integer', () => {
    expect(parseAtomicUnits('18446744073709551615', 'amount')).toBe(18_446_744_073_709_551_615n);
    expect(() => parseAtomicUnits('18446744073709551616', 'amount')).toThrow('exceeds the maximum u64');
  });
});

describe('deterministic execution gate', () => {
  it('allows the canonical source-locked fixture', () => {
    expect(validateManifest(manifest(), policy())).toMatchObject({ allowed: true, code: 'ALLOW' });
  });

  it('rejects a caller policy when the actual source lock is blocked', () => {
    const candidatePolicy = policy();
    const jupiter = candidatePolicy.sourceLock.entries.find((entry) => entry.name === 'jupiter-flashloan');
    if (!jupiter) throw new Error('fixture is missing the Jupiter source-lock entry');
    jupiter.status = 'blocked';

    expect(validateManifest(manifest(), candidatePolicy).code).toBe('SOURCE_LOCK_BLOCKED');
  });

  it('rejects a non-first DontFront transaction topology', () => {
    const candidate = manifest();
    candidate.transactions[0].instructions = candidate.transactions[0].instructions.filter((ix) => ix.classifier !== 'dontfront');
    expect(validateManifest(candidate, policy()).code).toBe('INSTRUCTION_TOPOLOGY_INVALID');
  });

  it('rejects arbitrary treasury destination replacement', () => {
    const candidate = manifest();
    candidate.settlement.treasuryDestination = 'Attacker1111111111111111111111111111111111';
    expect(validateManifest(candidate, policy()).code).toBe('DESTINATION_DENIED');
  });

  it('rejects a stale simulation receipt', () => {
    const candidate = manifest();
    candidate.simulation.simulationSlot = 97n;
    expect(validateManifest(candidate, policy()).code).toBe('SIMULATION_STALE');
  });

  it('rejects an unverified tip account', () => {
    const candidate = manifest();
    candidate.settlement.tipAccount = 'UnverifiedTip111111111111111111111111111111111';
    expect(validateManifest(candidate, policy()).code).toBe('TIP_ACCOUNT_DENIED');
  });

  it('rejects insufficient measured net profit', () => {
    const candidate = manifest();
    candidate.simulation.postVaultBalance = 1_015_000n;
    expect(validateManifest(candidate, policy()).code).toBe('NET_PROFIT_INSUFFICIENT');
  });

  it('rejects replayed nonce', () => {
    const candidatePolicy = policy();
    candidatePolicy.activeNonceSet = new Set([manifest().approvalNonce]);
    expect(validateManifest(manifest(), candidatePolicy).code).toBe('NONCE_REUSED');
  });
});


describe('protected-bundle isolation', () => {
  it('rejects a route instruction outside TX-1', () => {
    const candidate = manifest();
    candidate.transactions[1].instructions.push(instruction(1, 'route', FLASH_PROGRAM));
    expect(validateManifest(candidate, policy()).code).toBe('ROUTE_OUTSIDE_TX1');
  });

  it('rejects flash-borrow or flash-repay instructions outside TX-1', () => {
    const candidate = manifest();
    candidate.transactions[2].instructions.unshift(instruction(0, 'flash_repay', FLASH_PROGRAM));
    expect(validateManifest(candidate, policy()).code).toBe('FLASH_INSTRUCTION_OUTSIDE_TX1');
  });

  it('rejects an unrelated settlement instruction in the flash transaction', () => {
    const candidate = manifest();
    candidate.transactions[0].instructions.splice(4, 0, instruction(4, 'distribute', PAYMASTER_PROGRAM));
    expect(validateManifest(candidate, policy()).code).toBe('UNEXPECTED_INSTRUCTION_CLASSIFIER');
  });

  it('rejects a duplicated flash repayment instruction', () => {
    const candidate = manifest();
    candidate.transactions[0].instructions.splice(6, 0, instruction(6, 'flash_repay', FLASH_PROGRAM));

    expect(validateManifest(candidate, policy()).code).toBe('INSTRUCTION_TOPOLOGY_INVALID');
  });

  it('rejects a missing route between flash borrow and repayment', () => {
    const candidate = manifest();
    candidate.transactions[0].instructions = candidate.transactions[0].instructions.filter((ix) => ix.classifier !== 'route');

    expect(validateManifest(candidate, policy()).code).toBe('INSTRUCTION_TOPOLOGY_INVALID');
  });

  it('rejects an allowed route classifier after paymaster finalization', () => {
    const candidate = manifest();
    candidate.transactions[0].instructions.push(instruction(7, 'route', FLASH_PROGRAM));

    expect(validateManifest(candidate, policy()).code).toBe('INSTRUCTION_TOPOLOGY_INVALID');
  });

  it('rejects a decoded Jito tip that exceeds the manifest cap', () => {
    const candidate = manifest();
    const tip = candidate.transactions[2].instructions[1];
    if (!tip) throw new Error('fixture is missing Jito tip');
    tip.dataBase64 = systemTransferDataBase64(501n);

    expect(validateManifest(candidate, policy()).code).toBe('JITO_TIP_CAP_EXCEEDED');
  });

  it('rejects a decoded Jito tip bound to an unexpected recipient account', () => {
    const candidate = manifest();
    const recipient = candidate.transactions[2].accountMetas[1];
    if (!recipient) throw new Error('fixture is missing Jito tip recipient');
    recipient.pubkey = 'Attacker1111111111111111111111111111111111';

    expect(validateManifest(candidate, policy()).code).toBe('JITO_TIP_BINDING_INVALID');
  });

  it('rejects a jito tip that is not the final instruction of TX-3', () => {
    const candidate = manifest();
    candidate.transactions[2].instructions.push(instruction(2, 'treasury_settle', PAYMASTER_PROGRAM));
    expect(validateManifest(candidate, policy()).code).toBe('INSTRUCTION_TOPOLOGY_INVALID');
  });
});
