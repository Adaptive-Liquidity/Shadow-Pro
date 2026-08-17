import { createHash } from 'node:crypto';
import * as ed25519 from '@noble/ed25519';
import bs58 from 'bs58';
import { sha256Hex } from './canonical.js';

ed25519.etc.sha512Async = async (...messages: Uint8Array[]): Promise<Uint8Array> => {
  const digest = createHash('sha512').update(Buffer.concat(messages.map((message) => Buffer.from(message)))).digest();
  return new Uint8Array(digest);
};

export interface SignReceipt {
  requestId: string;
  idempotencyKey: string;
  signerPubkey: string;
  messageHash: string;
  serializedMessageBase64: string;
  signatureBase64: string;
  expiresAt: string;
}

export async function verifySignReceipt(receipt: SignReceipt, expectedSigner: string, expectedMessageHash: string, now: Date): Promise<void> {
  if (receipt.signerPubkey !== expectedSigner) {
    throw new Error('SIGNER_PUBKEY_MISMATCH');
  }
  if (receipt.messageHash !== expectedMessageHash) {
    throw new Error('SIGN_RECEIPT_MESSAGE_HASH_MISMATCH');
  }
  if (Date.parse(receipt.expiresAt) <= now.getTime()) {
    throw new Error('SIGN_RECEIPT_EXPIRED');
  }

  const message = Buffer.from(receipt.serializedMessageBase64, 'base64');
  if (message.length === 0 || sha256Hex(message) !== expectedMessageHash) {
    throw new Error('EXACT_MESSAGE_HASH_MISMATCH');
  }

  const publicKey = bs58.decode(receipt.signerPubkey);
  const signature = Buffer.from(receipt.signatureBase64, 'base64');
  if (publicKey.length !== 32 || signature.length !== 64) {
    throw new Error('INVALID_ED25519_RECEIPT_ENCODING');
  }
  const verified = await ed25519.verifyAsync(signature, message, publicKey);
  if (!verified) {
    throw new Error('INVALID_ED25519_SIGNATURE');
  }
}
