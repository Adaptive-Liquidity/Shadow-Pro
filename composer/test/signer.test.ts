import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import * as ed25519 from '@noble/ed25519';
import bs58 from 'bs58';
import { verifySignReceipt } from '../src/signer.js';

const privateKey = new Uint8Array(32).fill(7);
const message = Buffer.from('exact serialized Solana message fixture', 'utf8');
const messageHash = createHash('sha256').update(message).digest('hex');

async function validReceipt() {
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);
  const signature = await ed25519.signAsync(message, privateKey);
  return {
    requestId: 'request-1',
    idempotencyKey: 'nonce-1',
    signerPubkey: bs58.encode(publicKey),
    messageHash,
    serializedMessageBase64: message.toString('base64'),
    signatureBase64: Buffer.from(signature).toString('base64'),
    expiresAt: '2030-01-01T00:00:00.000Z',
  };
}

describe('remote signing receipt verification', () => {
  it('accepts an Ed25519 signature for the exact expected message bytes', async () => {
    const receipt = await validReceipt();
    await expect(verifySignReceipt(receipt, receipt.signerPubkey, messageHash, new Date('2026-08-16T00:00:00.000Z'))).resolves.toBeUndefined();
  });

  it('rejects receipt reuse against different message bytes', async () => {
    const receipt = await validReceipt();
    receipt.serializedMessageBase64 = Buffer.from('mutated message').toString('base64');
    await expect(verifySignReceipt(receipt, receipt.signerPubkey, messageHash, new Date('2026-08-16T00:00:00.000Z'))).rejects.toThrow('EXACT_MESSAGE_HASH_MISMATCH');
  });

  it('rejects a signer-role substitution', async () => {
    const receipt = await validReceipt();
    await expect(verifySignReceipt(receipt, 'DifferentSigner11111111111111111111111111111', messageHash, new Date('2026-08-16T00:00:00.000Z'))).rejects.toThrow('SIGNER_PUBKEY_MISMATCH');
  });

  it('rejects an invalid receipt expiry timestamp explicitly', async () => {
    const receipt = await validReceipt();
    receipt.expiresAt = 'not-a-timestamp';

    await expect(verifySignReceipt(receipt, receipt.signerPubkey, messageHash, new Date('2026-08-16T00:00:00.000Z')))
      .rejects.toThrow('SIGN_RECEIPT_EXPIRY_INVALID');
  });

  it('normalizes malformed Base58 signer bytes to a protocol encoding error', async () => {
    const receipt = await validReceipt();
    receipt.signerPubkey = '!!!not-base58!!!';

    await expect(verifySignReceipt(receipt, receipt.signerPubkey, messageHash, new Date('2026-08-16T00:00:00.000Z')))
      .rejects.toThrow('INVALID_ED25519_RECEIPT_ENCODING');
  });

  it('rejects malformed Base64 message and signature bytes before verification', async () => {
    const malformedMessage = await validReceipt();
    malformedMessage.serializedMessageBase64 = '%%%';
    await expect(verifySignReceipt(malformedMessage, malformedMessage.signerPubkey, messageHash, new Date('2026-08-16T00:00:00.000Z')))
      .rejects.toThrow('INVALID_ED25519_RECEIPT_ENCODING');

    const malformedSignature = await validReceipt();
    malformedSignature.signatureBase64 = '%%%';
    await expect(verifySignReceipt(malformedSignature, malformedSignature.signerPubkey, messageHash, new Date('2026-08-16T00:00:00.000Z')))
      .rejects.toThrow('INVALID_ED25519_RECEIPT_ENCODING');
  });
});
