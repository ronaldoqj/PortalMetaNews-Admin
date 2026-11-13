import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** What a secret protects; part of the key derivation and of the authenticated data, so one never opens another. */
export type SecretPurpose = 'smtp-password' | 'ai-api-key';

/** `APP_SECRET_KEY` is 32 random bytes as 64 hexadecimal characters (`openssl rand -hex 32`). */
export function isSecretKey(value: unknown): value is string {
  return typeof value === 'string' && /^[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Keeps the credentials of the integrations the panel configures (the SMTP password, the AI provider key) out of
 * the database in clear text. Portal Meta News does not encrypt news, media or accounts: this protects only secrets that would
 * let someone act in a third party's name. AES-256-GCM under a key derived (HKDF-SHA-256) from `APP_SECRET_KEY`
 * for each purpose, bound to its owner as authenticated data, so a ciphertext moved to another row never opens.
 * The stored form is `v1:<iv>:<tag>:<ciphertext>` in base64url; nothing here is ever logged.
 */
@Injectable()
export class SecretCipher {
  private readonly root: Buffer;

  constructor(@Inject(ConfigService) configuration: ConfigService) {
    const key = configuration.get<string>('APP_SECRET_KEY');
    if (!isSecretKey(key)) throw new Error('APP_SECRET_KEY must be 64 hexadecimal characters');
    this.root = Buffer.from(key, 'hex');
  }

  /** `owner` names whose secret it is (`site` for the portal own settings). */
  encrypt(plaintext: string, purpose: SecretPurpose, owner: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key(purpose), iv);
    cipher.setAAD(Buffer.from(`${purpose}:${owner}`, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join(':');
  }

  /** Fails closed on anything tampered with, moved or written under another key. */
  decrypt(payload: string, purpose: SecretPurpose, owner: string): string {
    const [version, iv, tag, ciphertext] = payload.split(':');
    if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error('Unreadable secret');
    const authTag = Buffer.from(tag, 'base64url');
    if (authTag.length !== TAG_BYTES) throw new Error('Unreadable secret');
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key(purpose), Buffer.from(iv, 'base64url'));
      decipher.setAAD(Buffer.from(`${purpose}:${owner}`, 'utf8'));
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      throw new Error('Unreadable secret');
    }
  }

  private key(purpose: SecretPurpose): Buffer {
    return Buffer.from(hkdfSync('sha256', this.root, Buffer.alloc(0), `pmn:${purpose}`, 32));
  }
}
