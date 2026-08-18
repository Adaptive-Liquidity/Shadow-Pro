import { createHash } from 'node:crypto';
import * as ed25519 from '@noble/ed25519';
import bs58 from 'bs58';
import { sha256Hex } from './canonical.js';

ed25519.etc.sha512Async = async (...messages: Uint8Array[]): Promise<Uint8Array> => {
  const digest = createHash('sha512').update(Buffer.concat(messages.map((message) => Buffer.from(message)))).digest();
  return new Uint8Array(digest);
};

function decodeCanonicalBase64(value: string): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('INVALID_ED25519_RECEIPT_ENCODING');
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) {
    throw new Error('INVALID_ED25519_RECEIPT_ENCODING');
  }
  return decoded;
}

function decodeEd25519PublicKey(value: string): Uint8Array {
  try {
    return bs58.decode(value);
  } catch {
    throw new Error('INVALID_ED25519_RECEIPT_ENCODING');
  }
}

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
  const expiryMilliseconds = Date.parse(receipt.expiresAt);
  if (!Number.isFinite(expiryMilliseconds)) {
    throw new Error('SIGN_RECEIPT_EXPIRY_INVALID');
  }
  if (expiryMilliseconds <= now.getTime()) {
    throw new Error('SIGN_RECEIPT_EXPIRED');
  }

  const message = decodeCanonicalBase64(receipt.serializedMessageBase64);
  if (message.length === 0 || sha256Hex(message) !== expectedMessageHash) {
    throw new Error('EXACT_MESSAGE_HASH_MISMATCH');
  }

  const publicKey = decodeEd25519PublicKey(receipt.signerPubkey);
  const signature = decodeCanonicalBase64(receipt.signatureBase64);
  if (publicKey.length !== 32 || signature.length !== 64) {
    throw new Error('INVALID_ED25519_RECEIPT_ENCODING');
  }
  const verified = await ed25519.verifyAsync(signature, message, publicKey);
  if (!verified) {
    throw new Error('INVALID_ED25519_SIGNATURE');
  }
}
