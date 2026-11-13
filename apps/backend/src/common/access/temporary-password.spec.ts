import { verify } from 'argon2';
import { hashAdminPassword } from './access.service.js';
import { generateTemporaryPassword, TEMPORARY_PASSWORD_ALPHABET, TEMPORARY_PASSWORD_LENGTH } from './temporary-password.js';

describe('temporary administrative passwords', () => {
  it('generates 16 unambiguous alphanumeric characters with at least 90 bits of entropy', () => {
    expect(TEMPORARY_PASSWORD_LENGTH).toBe(16);
    expect(TEMPORARY_PASSWORD_LENGTH * Math.log2(TEMPORARY_PASSWORD_ALPHABET.length)).toBeGreaterThan(90);
    expect(TEMPORARY_PASSWORD_ALPHABET).toMatch(/^[a-zA-Z0-9]+$/);
    // Characters easily confused when copied by hand are excluded.
    expect(TEMPORARY_PASSWORD_ALPHABET).not.toMatch(/[0O1lI]/);
    for (let index = 0; index < 50; index += 1) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(16);
      expect([...password].every((character) => TEMPORARY_PASSWORD_ALPHABET.includes(character))).toBe(true);
    }
  });

  it('never repeats and uses the whole alphabet', () => {
    const generated = Array.from({ length: 400 }, () => generateTemporaryPassword());
    expect(new Set(generated).size).toBe(generated.length);
    expect(new Set(generated.join('')).size).toBe(TEMPORARY_PASSWORD_ALPHABET.length);
  });

  it('satisfies the administrative password policy and verifies against its Argon2id hash', async () => {
    const password = generateTemporaryPassword();
    const stored = await hashAdminPassword(password);
    expect(stored).toMatch(/^\$argon2id\$/);
    expect(stored).not.toContain(password);
    await expect(verify(stored, password)).resolves.toBe(true);
  });
});
