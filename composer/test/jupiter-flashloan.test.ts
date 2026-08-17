import { describe, expect, it } from 'vitest';
import {
  decodeJupiterFlashloanInstruction,
  FlashloanDecodeError,
  JUPITER_FLASHLOAN_PROGRAM_ID,
  validateFlashloanBorrowPaybackPair,
  type CompiledAccountMeta,
  type CompiledFlashloanInstruction,
} from '../src/jupiter-flashloan.js';

const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const SYSTEM_PROGRAM = '11111111111111111111111111111111';
const INSTRUCTION_SYSVAR = 'Sysvar1nstructions1111111111111';
const BORROW = [103, 19, 78, 24, 240, 9, 135, 63];
const PAYBACK = [213, 47, 153, 137, 84, 243, 94, 232];

function accountMetas(): CompiledAccountMeta[] {
  return [
    { pubkey: 'Signer1111111111111111111111111111111111111', isSigner: true, isWritable: true },
    { pubkey: 'Admin11111111111111111111111111111111111111', isSigner: false, isWritable: true },
    { pubkey: 'BorrowerToken111111111111111111111111111111111', isSigner: false, isWritable: true },
    { pubkey: 'Mint111111111111111111111111111111111111111', isSigner: false, isWritable: false },
    { pubkey: 'Reserve1111111111111111111111111111111111111', isSigner: false, isWritable: true },
    { pubkey: 'Position111111111111111111111111111111111111', isSigner: false, isWritable: true },
    { pubkey: 'Rate111111111111111111111111111111111111111', isSigner: false, isWritable: false },
    { pubkey: 'Vault11111111111111111111111111111111111111', isSigner: false, isWritable: true },
    { pubkey: 'Liquidity111111111111111111111111111111111111', isSigner: false, isWritable: false },
    { pubkey: 'LiquidityProgram1111111111111111111111111111111', isSigner: false, isWritable: false },
    { pubkey: 'TokenProgram111111111111111111111111111111111', isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
    { pubkey: INSTRUCTION_SYSVAR, isSigner: false, isWritable: false },
  ];
}

function flashInstruction(kind: 'flashloan_borrow' | 'flashloan_payback', amount = 42n): CompiledFlashloanInstruction {
  const data = Buffer.alloc(16);
  Buffer.from(kind === 'flashloan_borrow' ? BORROW : PAYBACK).copy(data, 0);
  data.writeBigUInt64LE(amount, 8);
  return {
    programId: JUPITER_FLASHLOAN_PROGRAM_ID,
    dataBase64: data.toString('base64'),
    accounts: accountMetas(),
  };
}

function expectCode(action: () => void, code: string): void {
  try {
    action();
    throw new Error('Expected FlashloanDecodeError');
  } catch (error) {
    expect(error).toBeInstanceOf(FlashloanDecodeError);
    expect((error as FlashloanDecodeError).code).toBe(code);
  }
}

describe('immutable Jupiter Flashloan decoder', () => {
  it('independently decodes source-locked borrow and payback bytes', () => {
    expect(decodeJupiterFlashloanInstruction(flashInstruction('flashloan_borrow', 123n))).toMatchObject({
      kind: 'flashloan_borrow',
      amount: 123n,
      accountCount: 14,
    });
    expect(decodeJupiterFlashloanInstruction(flashInstruction('flashloan_payback', 123n))).toMatchObject({
      kind: 'flashloan_payback',
      amount: 123n,
      accountCount: 14,
    });
  });

  it('rejects every signer or writable-bit mutation in the source-locked matrix', () => {
    for (let index = 0; index < 14; index += 1) {
      for (const field of ['isSigner', 'isWritable'] as const) {
        const candidate = flashInstruction('flashloan_borrow');
        const account = candidate.accounts[index];
        if (!account) throw new Error(`Missing test account ${index}`);
        candidate.accounts = candidate.accounts.map((entry, current) =>
          current === index ? { ...entry, [field]: !entry[field] } : entry,
        );
        expectCode(() => decodeJupiterFlashloanInstruction(candidate), 'FLASH_ACCOUNT_META_MISMATCH');
      }
    }
  });

  it('rejects fixed program/sysvar substitutions and omitted or surplus accounts', () => {
    for (const index of [11, 12, 13]) {
      const candidate = flashInstruction('flashloan_borrow');
      candidate.accounts = candidate.accounts.map((entry, current) =>
        current === index ? { ...entry, pubkey: `Substituted${index}111111111111111111111111111111` } : entry,
      );
      expectCode(() => decodeJupiterFlashloanInstruction(candidate), 'FLASH_FIXED_ACCOUNT_MISMATCH');
    }

    const omitted = flashInstruction('flashloan_borrow');
    omitted.accounts = omitted.accounts.slice(0, 13);
    expectCode(() => decodeJupiterFlashloanInstruction(omitted), 'FLASH_ACCOUNT_COUNT_INVALID');

    const surplus = flashInstruction('flashloan_borrow');
    surplus.accounts = [...surplus.accounts, surplus.accounts[0]!];
    expectCode(() => decodeJupiterFlashloanInstruction(surplus), 'FLASH_ACCOUNT_COUNT_INVALID');
  });

  it('rejects arbitrary program IDs, malformed payloads, unsupported discriminators, zero amount, and wrong data length', () => {
    const wrongProgram = flashInstruction('flashloan_borrow');
    wrongProgram.programId = 'Attacker111111111111111111111111111111111111';
    expectCode(() => decodeJupiterFlashloanInstruction(wrongProgram), 'FLASH_PROGRAM_DENIED');

    const malformedBase64 = flashInstruction('flashloan_borrow');
    malformedBase64.dataBase64 = 'not@base64';
    expectCode(() => decodeJupiterFlashloanInstruction(malformedBase64), 'FLASH_DATA_BASE64_INVALID');

    const unknownDiscriminator = flashInstruction('flashloan_borrow');
    const unknownData = Buffer.from(unknownDiscriminator.dataBase64, 'base64');
    const firstByte = unknownData.at(0);
    if (firstByte === undefined) throw new Error('Expected discriminator byte');
    unknownData[0] = firstByte ^ 0xff;
    unknownDiscriminator.dataBase64 = unknownData.toString('base64');
    expectCode(() => decodeJupiterFlashloanInstruction(unknownDiscriminator), 'FLASH_DISCRIMINATOR_DENIED');

    expectCode(() => decodeJupiterFlashloanInstruction(flashInstruction('flashloan_borrow', 0n)), 'FLASH_AMOUNT_ZERO');

    const shortData = flashInstruction('flashloan_borrow');
    shortData.dataBase64 = Buffer.alloc(15).toString('base64');
    expectCode(() => decodeJupiterFlashloanInstruction(shortData), 'FLASH_DATA_LENGTH_INVALID');
  });
});

describe('Flashloan borrow/payback pair gate', () => {
  function borrow(amount = 42n) {
    return decodeJupiterFlashloanInstruction(flashInstruction('flashloan_borrow', amount));
  }
  function payback(amount = 42n) {
    return decodeJupiterFlashloanInstruction(flashInstruction('flashloan_payback', amount));
  }

  it('accepts exactly one ordered same-amount borrow/payback pair', () => {
    expect(() => validateFlashloanBorrowPaybackPair([
      { ordinal: 3, decoded: borrow(42n) },
      { ordinal: 5, decoded: payback(42n) },
    ])).not.toThrow();
  });

  it('rejects missing, duplicated, reordered, and altered-amount payback paths', () => {
    expectCode(() => validateFlashloanBorrowPaybackPair([{ ordinal: 3, decoded: borrow() }]), 'FLASH_PAIR_COUNT_INVALID');
    expectCode(() => validateFlashloanBorrowPaybackPair([
      { ordinal: 3, decoded: borrow() },
      { ordinal: 4, decoded: payback() },
      { ordinal: 5, decoded: payback() },
    ]), 'FLASH_PAIR_COUNT_INVALID');
    expectCode(() => validateFlashloanBorrowPaybackPair([
      { ordinal: 5, decoded: payback() },
      { ordinal: 6, decoded: borrow() },
    ]), 'FLASH_PAIR_ORDER_INVALID');
    expectCode(() => validateFlashloanBorrowPaybackPair([
      { ordinal: 3, decoded: borrow(42n) },
      { ordinal: 5, decoded: payback(41n) },
    ]), 'FLASH_AMOUNT_MISMATCH');
  });
});
