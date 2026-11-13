import { randomInt } from 'node:crypto';

/** Letters and digits without look-alikes (0/O, 1/l/I), so a password copied by hand is not mistyped. */
export const TEMPORARY_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export const TEMPORARY_PASSWORD_LENGTH = 16;

/**
 * A high-entropy temporary password (16 of 57 symbols, about 93 bits) from the CSPRNG. `randomInt`
 * draws uniformly, so there is no modulo bias. The value is shown once to the administrator who
 * generated it and only its Argon2id hash is stored.
 */
export function generateTemporaryPassword(): string {
  let password = '';
  for (let index = 0; index < TEMPORARY_PASSWORD_LENGTH; index += 1) {
    password += TEMPORARY_PASSWORD_ALPHABET[randomInt(TEMPORARY_PASSWORD_ALPHABET.length)];
  }
  return password;
}
