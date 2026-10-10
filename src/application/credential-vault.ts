import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppError } from '../domain/contracts.js';

/**
 * ADR-0031 · provider credentials are encrypted server-side with AES-256-GCM. The key comes from the environment
 * (BRANDOPOLIS_CREDENTIALS_KEY, base64 of 32 bytes; BRANDOPOLIS_CREDENTIALS_KEY_ID names it for rotation). The
 * plaintext never leaves this module except to the provider adapter that needs it; it is never logged, returned by
 * an API, exported or placed in a prompt.
 */
export type Vault = { keyId: string; seal(plaintext: string, aad: string): string; open(ciphertext: string, keyId: string, aad: string): string };

export function createVault(key: Buffer, keyId: string): Vault {
  if (key.length !== 32) throw new AppError('INVALID', 'Credential key must be 32 bytes');
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) throw new AppError('INVALID', 'Invalid credential key id');
  return {
    keyId,
    seal(plaintext, aad) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(aad, 'utf8'));
      const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
    },
    open(ciphertext, sealedKeyId, aad) {
      if (sealedKeyId !== keyId) throw new AppError('UNAVAILABLE', 'Credential sealed with another key');
      const [version, iv, tag, body] = ciphertext.split('.');
      if (version !== 'v1' || !iv || !tag || !body) throw new AppError('INVALID', 'Malformed credential');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      try { return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8'); }
      catch { throw new AppError('INVALID', 'Credential integrity check failed'); }
    }
  };
}

/** Vault from the environment, or undefined when not configured (connections are then unavailable, never faked). */
export function vaultFromEnv(env: NodeJS.ProcessEnv = process.env): Vault | undefined {
  const raw = env.BRANDOPOLIS_CREDENTIALS_KEY;
  if (!raw) return undefined;
  return createVault(Buffer.from(raw, 'base64'), env.BRANDOPOLIS_CREDENTIALS_KEY_ID || 'k1');
}
