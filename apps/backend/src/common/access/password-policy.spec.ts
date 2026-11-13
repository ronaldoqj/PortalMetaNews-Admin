import { isStrongAdminPassword } from './password-policy.js';

describe('definitive administrative password policy', () => {
  it.each([
    'Correct-horse-42',
    'battery staple 9X',
    'UPPER lower 1234',
    'sem-numeros-MAS-longa',
  ])('accepts %s (12-128 characters with at least three character classes)', (password) => {
    expect(isStrongAdminPassword(password)).toBe(true);
  });

  it.each([
    ['too short', 'Ab1-short'],
    ['too long', `Ab1-${'x'.repeat(125)}`],
    ['lowercase only', 'onlylowercaseletters'],
    ['two classes', 'lowercase-only-with-dashes'],
    ['digits and lowercase', 'abcdef123456'],
    ['whitespace padding', '            '],
    ['repeated character', 'AAAAAAAAAAAAAAAAa1'],
  ])('rejects a password that is %s', (_label, password) => {
    expect(isStrongAdminPassword(password)).toBe(false);
  });

  it('rejects passwords that contain the account e-mail local part', () => {
    expect(isStrongAdminPassword('Maria.Silva-2026!', 'maria.silva@example.org')).toBe(false);
    expect(isStrongAdminPassword('Correct-horse-42', 'maria.silva@example.org')).toBe(true);
  });
});
