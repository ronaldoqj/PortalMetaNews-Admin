import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { SecretCipher } from './secret-cipher.service.js';

const cipher = (key = 'ab'.repeat(32)) => new SecretCipher(new ConfigService({ APP_SECRET_KEY: key }));

describe('SecretCipher', () => {
  it('round-trips and never repeats a ciphertext', () => {
    const secret = cipher();
    const first = secret.encrypt('chave-do-gemini', 'ai-api-key', 'tenant-1');
    expect(first).not.toContain('chave-do-gemini');
    expect(secret.encrypt('chave-do-gemini', 'ai-api-key', 'tenant-1')).not.toBe(first);
    expect(secret.decrypt(first, 'ai-api-key', 'tenant-1')).toBe('chave-do-gemini');
  });

  it.each([
    ['another owner', (c: SecretCipher, p: string) => c.decrypt(p, 'ai-api-key', 'tenant-2')],
    ['another purpose', (c: SecretCipher, p: string) => c.decrypt(p, 'smtp-password', 'tenant-1')],
    ['another key', (_c: SecretCipher, p: string) => cipher('cd'.repeat(32)).decrypt(p, 'ai-api-key', 'tenant-1')],
    ['a tampered payload', (c: SecretCipher, p: string) => c.decrypt(p.slice(0, -2) + 'AA', 'ai-api-key', 'tenant-1')],
    ['garbage', (c: SecretCipher) => c.decrypt('lixo', 'ai-api-key', 'tenant-1')],
  ])('refuses to decrypt for %s', (_name, attempt) => {
    const secret = cipher();
    expect(() => attempt(secret, secret.encrypt('segredo', 'ai-api-key', 'tenant-1'))).toThrow();
  });

  it.each(['', 'curta', 'z'.repeat(64)])('refuses the key %j', (key) => {
    expect(() => cipher(key)).toThrow('APP_SECRET_KEY');
  });
});
