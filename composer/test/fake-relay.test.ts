import { describe, expect, it } from 'vitest';
import { FakeRelay } from '../src/fake-relay.js';
import type { TransactionManifest } from '../src/types.js';

function manifest(nonce = 'n'.repeat(64), expirySlot = 110n): TransactionManifest {
  return {
    approvalNonce: nonce,
    transactions: [
      { messageHash: 'a'.repeat(64), expirySlot },
      { messageHash: 'b'.repeat(64), expirySlot },
      { messageHash: 'c'.repeat(64), expirySlot },
    ],
  } as unknown as TransactionManifest;
}

describe('local fake relay', () => {
  it('accepts one non-expired canonical bundle and reports pending only as acknowledgement', () => {
    const relay = new FakeRelay();
    const receipt = relay.submit(manifest(), 100n);
    expect(receipt.status).toBe('Pending');
    expect(relay.getStatus(receipt.bundleId, 100n).status).toBe('Pending');
  });

  it('binds bundle identity to the approval nonce even when exact messages match', () => {
    const relay = new FakeRelay();
    const first = relay.submit(manifest('a'.repeat(64)), 100n);
    const second = relay.submit(manifest('b'.repeat(64)), 100n);

    expect(first.bundleId).not.toBe(second.bundleId);
  });

  it('rejects a second submission with the same approval nonce', () => {
    const relay = new FakeRelay();
    relay.submit(manifest(), 100n);
    expect(() => relay.submit(manifest(), 100n)).toThrow('Duplicate approval nonce');
  });

  it('uses the earliest transaction expiry and persists expiry invalidation', () => {
    const relay = new FakeRelay();
    const candidate = manifest();
    candidate.transactions[2].expirySlot = 105n;
    const receipt = relay.submit(candidate, 100n);

    expect(receipt.expirySlot).toBe(105n);
    expect(relay.getStatus(receipt.bundleId, 105n).status).toBe('Invalid');
    expect(() => relay.setStatus(receipt.bundleId, 'Landed')).toThrow('Terminal relay status');
    expect(() => relay.submit(manifest('x'.repeat(64), 110n), 110n)).toThrow('Expired bundle');
  });

  it('prevents terminal-status rewrites and returns unknown for an unrecognized bundle', () => {
    const relay = new FakeRelay();
    const receipt = relay.submit(manifest(), 100n);
    expect(relay.setStatus(receipt.bundleId, 'Landed').status).toBe('Landed');
    expect(() => relay.setStatus(receipt.bundleId, 'Failed')).toThrow('Terminal relay status');
    expect(relay.getStatus('unknown', 100n).status).toBe('Unknown');
  });
});
