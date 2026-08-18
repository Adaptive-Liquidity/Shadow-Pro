import { createHash } from 'node:crypto';
import type { TransactionManifest } from './types.js';

export type FakeRelayStatus = 'Pending' | 'Failed' | 'Landed' | 'Invalid' | 'Unknown';

export interface FakeRelayReceipt {
  bundleId: string;
  status: FakeRelayStatus;
  expirySlot: bigint;
  messageHashes: readonly [string, string, string];
}

export class FakeRelay {
  private readonly byNonce = new Map<string, FakeRelayReceipt>();
  private readonly byBundleId = new Map<string, FakeRelayReceipt>();

  submit(manifest: TransactionManifest, currentSlot: bigint): FakeRelayReceipt {
    if (manifest.transactions.length !== 3) {
      throw new Error('Fake relay accepts only the canonical three-transaction protected bundle.');
    }
    if (manifest.transactions.some((transaction) => transaction.expirySlot <= currentSlot)) {
      throw new Error('Expired bundle cannot be submitted or retried.');
    }
    if (this.byNonce.has(manifest.approvalNonce)) {
      throw new Error('Duplicate approval nonce cannot be resubmitted.');
    }

    const bundleId = createHash('sha256')
      .update(manifest.transactions.map((transaction) => transaction.messageHash).join(':'))
      .digest('hex');
    const receipt: FakeRelayReceipt = {
      bundleId,
      status: 'Pending',
      expirySlot: manifest.transactions[0].expirySlot,
      messageHashes: [
        manifest.transactions[0].messageHash,
        manifest.transactions[1].messageHash,
        manifest.transactions[2].messageHash,
      ],
    };
    this.byNonce.set(manifest.approvalNonce, receipt);
    this.byBundleId.set(bundleId, receipt);
    return receipt;
  }

  setStatus(bundleId: string, status: Exclude<FakeRelayStatus, 'Unknown'>): FakeRelayReceipt {
    const receipt = this.byBundleId.get(bundleId);
    if (!receipt) throw new Error('Unknown bundle ID.');
    if (receipt.status === 'Landed' || receipt.status === 'Failed' || receipt.status === 'Invalid') {
      throw new Error('Terminal relay status cannot be overwritten.');
    }
    const updated = { ...receipt, status };
    this.byBundleId.set(bundleId, updated);
    for (const [nonce, candidate] of this.byNonce.entries()) {
      if (candidate.bundleId === bundleId) this.byNonce.set(nonce, updated);
    }
    return updated;
  }

  getStatus(bundleId: string, currentSlot: bigint): FakeRelayReceipt {
    const receipt = this.byBundleId.get(bundleId);
    if (!receipt) {
      return { bundleId, status: 'Unknown', expirySlot: currentSlot, messageHashes: ['', '', ''] };
    }
    if (receipt.status === 'Pending' && currentSlot >= receipt.expirySlot) {
      return { ...receipt, status: 'Invalid' };
    }
    return receipt;
  }
}
