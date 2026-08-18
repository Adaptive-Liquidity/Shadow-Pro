import { createHash } from 'node:crypto';
import type { ProfitSplit } from './types.js';

const HASH_HEX = /^[0-9a-f]{64}$/;
const U64_MAX = 18_446_744_073_709_551_615n;

export function assertHash(value: string, field: string): void {
  if (!HASH_HEX.test(value)) {
    throw new Error(`${field} must be a lowercase 32-byte SHA-256 hexadecimal string`);
  }
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return JSON.stringify(value.toString(10));
  if (typeof value === 'number') {
    throw new Error('Canonical manifests forbid JSON numbers; use base-10 integer strings');
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeValue).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeValue(record[key])}`)
      .join(',')}}`;
  }
  throw new Error(`Unsupported canonical value type: ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return canonicalizeValue(value);
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function toManifestWire(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString(10);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('Manifest numbers must be non-negative safe integers before wire normalization');
    }
    return value.toString(10);
  }
  if (Array.isArray(value)) return value.map(toManifestWire);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toManifestWire(item)]));
  }
  return value;
}

export function manifestHash(manifest: Record<string, unknown>): string {
  const { approvals: _approvals, ...unsignedManifest } = manifest;
  return sha256Hex(canonicalJson(toManifestWire(unsignedManifest)));
}

export function parseAtomicUnits(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]{0,19})$/.test(value)) {
    throw new Error(`${field} must be an unsigned base-10 u64 integer string`);
  }
  const parsed = BigInt(value);
  if (parsed > U64_MAX) {
    throw new Error(`${field} exceeds the maximum u64 atomic-unit value`);
  }
  return parsed;
}

export function checkedProfitSplit(
  postVaultBalance: bigint,
  preVaultBalance: bigint,
  committedObligations: bigint,
  minimumNetProfit: bigint,
): ProfitSplit {
  if ([postVaultBalance, preVaultBalance, committedObligations, minimumNetProfit].some((v) => v < 0n)) {
    throw new Error('Atomic amounts must be unsigned');
  }
  const requiredPostRepayment = preVaultBalance + committedObligations;
  if (postVaultBalance < requiredPostRepayment) {
    throw new Error('REPAYMENT_OR_OBLIGATION_SHORTFALL');
  }
  const eligibleProfit = postVaultBalance - requiredPostRepayment;
  if (eligibleProfit <= minimumNetProfit) {
    throw new Error('NET_PROFIT_INSUFFICIENT');
  }
  const paymasterShare = (eligibleProfit * 1_500n) / 10_000n;
  const treasuryShare = eligibleProfit - paymasterShare;
  if (paymasterShare + treasuryShare !== eligibleProfit) {
    throw new Error('PROFIT_SPLIT_INVARIANT_FAILED');
  }
  return { eligibleProfit, paymasterShare, treasuryShare };
}
