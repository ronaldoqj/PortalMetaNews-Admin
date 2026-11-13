export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const ADMIN_PASSWORD_MAX_LENGTH = 128;

/**
 * Policy for a password an administrator chooses to replace a temporary one: 12-128 characters
 * with at least three of lowercase, uppercase, digits and symbols, not dominated by one repeated
 * character and not containing the account's e-mail local part. Temporary passwords are generated
 * separately and only need the length bound enforced by `hashAdminPassword`.
 */
export function isStrongAdminPassword(password: string, email?: string): boolean {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH || password.length > ADMIN_PASSWORD_MAX_LENGTH) return false;
  if (!password.trim() || /(.)\1{5,}/u.test(password)) return false;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((pattern) => pattern.test(password)).length;
  if (classes < 3) return false;
  const localPart = email?.split('@')[0]?.toLowerCase();
  return !(localPart && localPart.length >= 4 && password.toLowerCase().includes(localPart));
}
