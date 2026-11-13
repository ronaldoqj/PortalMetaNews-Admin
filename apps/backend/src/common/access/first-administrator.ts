import { ConflictException, type LoggerService } from '@nestjs/common';
import { isEmail } from 'class-validator';
import type { AccessService } from './access.service.js';
import { isStrongAdminPassword } from './password-policy.js';

export const BOOTSTRAP_REQUIREMENTS = 'ADMIN_BOOTSTRAP_EMAIL and a strong ADMIN_BOOTSTRAP_PASSWORD (12-128 characters, three character classes)';

/** The first administrator that `ADMIN_BOOTSTRAP_*` describes, or undefined when the values are missing or too weak. */
export function bootstrapAccount(environment: NodeJS.ProcessEnv): { name: string; email: string; password: string } | undefined {
  const email = environment.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = environment.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !isEmail(email) || !password || !isStrongAdminPassword(password, email)) return undefined;
  return { name: environment.ADMIN_BOOTSTRAP_NAME?.trim() || 'Administrador', email, password };
}

/**
 * Headless installation as the API starts: while no account exists, `ADMIN_BOOTSTRAP_EMAIL` and
 * `ADMIN_BOOTSTRAP_PASSWORD` in the server's environment create the first one (Administrador role), through the same audited
 * operation as the installation form and `npm run admin:bootstrap`. Whoever sets the server's environment already holds
 * the portal, so no setup token is asked. Once an account exists the values are never used again, and every start
 * asks for their removal. A failure never stops the API, and no message carries the password.
 */
export async function installFirstAdministrator(
  access: Pick<AccessService, 'setupRequired' | 'initialSetup'>,
  environment: NodeJS.ProcessEnv,
  logger: Pick<LoggerService, 'log' | 'warn' | 'error'>,
): Promise<void> {
  if (!environment.ADMIN_BOOTSTRAP_EMAIL && !environment.ADMIN_BOOTSTRAP_PASSWORD) return;
  if (!(await access.setupRequired())) {
    logger.warn('The panel is installed: remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD from the environment.');
    return;
  }
  const account = bootstrapAccount(environment);
  if (!account) {
    logger.error(`No administrator created: set ${BOOTSTRAP_REQUIREMENTS}.`);
    return;
  }
  try {
    await access.initialSetup(account, { session: false });
    logger.log('Initial administrator created from ADMIN_BOOTSTRAP_EMAIL; remove the bootstrap values from the environment.');
  } catch (error) {
    // Another instance starting at the same moment installed the panel first.
    if (error instanceof ConflictException) return;
    logger.error('Unable to create the initial administrator; the API starts without it.');
  }
}
