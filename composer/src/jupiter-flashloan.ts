export const JUPITER_FLASHLOAN_PROGRAM_ID = 'jupgfSgfuAXv4B6R2Uxu85Z1qdzgju79s6MfZekN6XS';
export const JUPITER_FLASHLOAN_IDL_SHA256 = '7fac42ff8320d70162f81c610cb985418a11ed8d40f09a0b2cc3809fc25ef4be';

const BORROW_DISCRIMINATOR = Buffer.from([103, 19, 78, 24, 240, 9, 135, 63]);
const PAYBACK_DISCRIMINATOR = Buffer.from([213, 47, 153, 137, 84, 243, 94, 232]);
const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const INSTRUCTION_SYSVAR = 'Sysvar1nstructions1111111111111';

export type FlashloanInstructionKind = 'flashloan_borrow' | 'flashloan_payback';

export interface CompiledAccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface CompiledFlashloanInstruction {
  programId: string;
  dataBase64: string;
  accounts: readonly CompiledAccountMeta[];
}

export interface DecodedFlashloanInstruction {
  kind: FlashloanInstructionKind;
  amount: bigint;
  accountNames: readonly string[];
  accountCount: 14;
}

export interface FlashloanOccurrence {
  ordinal: number;
  decoded: DecodedFlashloanInstruction;
}

export class FlashloanDecodeError extends Error {
  public readonly code: string;

  public constructor(code: string, detail: string) {
    super(detail);
    this.code = code;
    this.name = 'FlashloanDecodeError';
  }
}

const ACCOUNT_RULES: ReadonlyArray<{
  readonly name: string;
  readonly signer: boolean;
  readonly writable: boolean;
  readonly fixedPubkey?: string;
}> = [
  { name: 'signer', signer: true, writable: true },
  { name: 'flashloan_admin', signer: false, writable: true },
  { name: 'signer_borrow_token_account', signer: false, writable: true },
  { name: 'mint', signer: false, writable: false },
  { name: 'flashloan_token_reserves_liquidity', signer: false, writable: true },
  { name: 'flashloan_borrow_position_on_liquidity', signer: false, writable: true },
  { name: 'rate_model', signer: false, writable: false },
  { name: 'vault', signer: false, writable: true },
  { name: 'liquidity', signer: false, writable: false },
  { name: 'liquidity_program', signer: false, writable: false },
  { name: 'token_program', signer: false, writable: false },
  {
    name: 'associated_token_program',
    signer: false,
    writable: false,
    fixedPubkey: ASSOCIATED_TOKEN_PROGRAM,
  },
  { name: 'system_program', signer: false, writable: false, fixedPubkey: SYSTEM_PROGRAM },
  { name: 'instruction_sysvar', signer: false, writable: false, fixedPubkey: INSTRUCTION_SYSVAR },
] as const;

function exactBase64Bytes(value: string): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new FlashloanDecodeError('FLASH_DATA_BASE64_INVALID', 'Instruction data is not canonical standard base64.');
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) {
    throw new FlashloanDecodeError('FLASH_DATA_BASE64_INVALID', 'Instruction data does not round-trip as canonical base64.');
  }
  return decoded;
}

function classifyDiscriminator(value: Buffer): FlashloanInstructionKind {
  if (value.equals(BORROW_DISCRIMINATOR)) {
    return 'flashloan_borrow';
  }
  if (value.equals(PAYBACK_DISCRIMINATOR)) {
    return 'flashloan_payback';
  }
  throw new FlashloanDecodeError('FLASH_DISCRIMINATOR_DENIED', 'Instruction discriminator is not source-locked.');
}

function validateAccounts(accounts: readonly CompiledAccountMeta[]): void {
  if (accounts.length !== ACCOUNT_RULES.length) {
    throw new FlashloanDecodeError('FLASH_ACCOUNT_COUNT_INVALID', 'Flashloan account count must exactly match the 14-account immutable matrix.');
  }

  for (const [index, rule] of ACCOUNT_RULES.entries()) {
    const actual = accounts[index];
    if (!actual) {
      throw new FlashloanDecodeError('FLASH_ACCOUNT_MISSING', `Missing account at index ${index}.`);
    }
    if (actual.isSigner !== rule.signer || actual.isWritable !== rule.writable) {
      throw new FlashloanDecodeError('FLASH_ACCOUNT_META_MISMATCH', `Account ${rule.name} at index ${index} has an unauthorized signer or writable bit.`);
    }
    if (rule.fixedPubkey && actual.pubkey !== rule.fixedPubkey) {
      throw new FlashloanDecodeError('FLASH_FIXED_ACCOUNT_MISMATCH', `Account ${rule.name} at index ${index} does not match the immutable IDL fixed address.`);
    }
  }
}

/**
 * Decodes one compiled Jupiter Flashloan instruction against the immutable IDL.
 * This accepts no optional-account omission variant: missing or substituted accounts fail closed.
 */
export function decodeJupiterFlashloanInstruction(
  instruction: CompiledFlashloanInstruction,
): DecodedFlashloanInstruction {
  if (instruction.programId !== JUPITER_FLASHLOAN_PROGRAM_ID) {
    throw new FlashloanDecodeError('FLASH_PROGRAM_DENIED', 'Instruction program ID does not match the source-locked Jupiter Flashloan program.');
  }

  const data = exactBase64Bytes(instruction.dataBase64);
  if (data.length !== 16) {
    throw new FlashloanDecodeError('FLASH_DATA_LENGTH_INVALID', 'Flashloan instruction data must be exactly discriminator plus one u64 amount.');
  }

  const kind = classifyDiscriminator(data.subarray(0, 8));
  const amount = data.readBigUInt64LE(8);
  if (amount === 0n) {
    throw new FlashloanDecodeError('FLASH_AMOUNT_ZERO', 'Flashloan amount must be positive.');
  }

  validateAccounts(instruction.accounts);
  return {
    kind,
    amount,
    accountNames: ACCOUNT_RULES.map((rule) => rule.name),
    accountCount: 14,
  };
}

/**
 * Validates the Flashloan-only subsequence extracted from TX-1. Route instructions are
 * intentionally not accepted here; callers must classify and validate them separately.
 */
export function validateFlashloanBorrowPaybackPair(
  occurrences: readonly FlashloanOccurrence[],
): void {
  if (occurrences.length !== 2) {
    throw new FlashloanDecodeError('FLASH_PAIR_COUNT_INVALID', 'TX-1 must contain exactly one source-locked borrow and one source-locked payback.');
  }

  const [borrow, payback] = occurrences;
  if (!borrow || !payback || borrow.decoded.kind !== 'flashloan_borrow' || payback.decoded.kind !== 'flashloan_payback') {
    throw new FlashloanDecodeError('FLASH_PAIR_ORDER_INVALID', 'Flashloan borrow must precede exactly one payback.');
  }
  if (borrow.ordinal >= payback.ordinal) {
    throw new FlashloanDecodeError('FLASH_PAIR_ORDER_INVALID', 'Flashloan borrow must precede payback in TX-1.');
  }
  if (borrow.decoded.amount !== payback.decoded.amount) {
    throw new FlashloanDecodeError('FLASH_AMOUNT_MISMATCH', 'Flashloan payback amount must exactly equal the decoded borrow amount.');
  }
}
