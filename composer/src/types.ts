import type { SourceLock } from './source-lock.js';

export const SETTLEMENT_ROLES = [
  'execute_flash_route',
  'distribute_profit',
  'treasury_settle_and_tip',
] as const;

export type SettlementRole = (typeof SETTLEMENT_ROLES)[number];

export const INSTRUCTION_CLASSIFIERS = [
  'compute_budget',
  'dontfront',
  'paymaster_begin',
  'flash_borrow',
  'route',
  'flash_repay',
  'paymaster_finalize',
  'distribute',
  'treasury_settle',
  'jito_tip',
] as const;

export type InstructionClassifier = (typeof INSTRUCTION_CLASSIFIERS)[number];

export interface AccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
  ownerProgram: string;
}

export interface DecodedInstruction {
  ordinal: number;
  programId: string;
  dataHash: string;
  accountIndices: number[];
  classifier: InstructionClassifier;
}

export interface RequiredSigner {
  pubkey: string;
  role: 'agent_intent' | 'paymaster_fee_payer' | 'external';
}

export interface DecodedTransaction {
  index: 0 | 1 | 2;
  role: SettlementRole;
  serializedMessageBase64: string;
  messageHash: string;
  recentBlockhash: string;
  expirySlot: bigint;
  feePayer: string;
  requiredSigners: RequiredSigner[];
  instructions: DecodedInstruction[];
  accountMetas: AccountMeta[];
  addressLookupTables: string[];
  computeUnitLimit: bigint;
  computeUnitPriceMicroLamports: bigint;
}

export interface AtomicAmount {
  mint: string;
  atomicUnits: bigint;
}

export interface SimulationReceipt {
  endpointId: string;
  simulationSlot: bigint;
  completedAt: string;
  receiptHash: string;
  messageHashes: [string, string, string];
  preVaultBalance: bigint;
  postVaultBalance: bigint;
  repaymentObligations: bigint;
  unitsConsumed: [bigint, bigint, bigint];
}

export interface RiskCaps {
  maxBaseFeeLamports: bigint;
  maxPriorityFeeLamports: bigint;
  maxTipLamports: bigint;
  maxTotalFeeExposureLamports: bigint;
  slippageBps: number;
  minimumNetProfit: AtomicAmount;
  maxSlotDelta: bigint;
}

export interface SettlementBinding {
  settlementPda: string;
  profitMint: string;
  paymasterBps: 1500;
  treasuryBps: 8500;
  treasuryDestination: string;
  paymasterDestination: string;
  tipAccount: string;
}

export interface TransactionManifest {
  schemaVersion: '1.1';
  manifestId: string;
  approvalNonce: string;
  policyHash: string;
  createdAt: string;
  simulation: SimulationReceipt;
  risk: RiskCaps;
  transactions: [DecodedTransaction, DecodedTransaction, DecodedTransaction];
  settlement: SettlementBinding;
}

export interface GatePolicy {
  policyHash: string;
  agentPubkey: string;
  paymasterFeePayer: string;
  allowedProgramIds: ReadonlySet<string>;
  allowedAddressLookupTables: ReadonlySet<string>;
  currentJitoTipAccounts: ReadonlySet<string>;
  allowedProfitMint: string;
  paymasterDestination: string;
  treasuryDestination: string;
  maxComputeUnitLimit: bigint;
  currentSlot: bigint;
  activeNonceSet: ReadonlySet<string>;
  sourceLock: SourceLock;
  requiredSourceLockEntries: readonly string[];
  protocolPaused: boolean;
}

export interface GateDecision {
  allowed: boolean;
  code: string;
  detail: string;
  manifestHash?: string;
}

export interface ProfitSplit {
  eligibleProfit: bigint;
  paymasterShare: bigint;
  treasuryShare: bigint;
}
