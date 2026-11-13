import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { installFirstAdministrator } from './first-administrator.js';

const PASSWORD = 'Bootstrap-Secret-2026';

function start(environment: NodeJS.ProcessEnv, { installed = false, failure }: { installed?: boolean; failure?: Error } = {}) {
  const access = {
    setupRequired: vi.fn(async () => !installed),
    initialSetup: vi.fn(async () => {
      if (failure) throw failure;
      return null;
    }),
  };
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { access, logger, run: () => installFirstAdministrator(access as never, environment, logger) };
}

describe('first administrator from the environment at start', () => {
  it('creates it once from ADMIN_BOOTSTRAP_*, through the audited installation, without a session', async () => {
    const { access, logger, run } = start({ ADMIN_BOOTSTRAP_EMAIL: ' Owner@Example.org ', ADMIN_BOOTSTRAP_PASSWORD: PASSWORD });
    await run();
    expect(access.initialSetup).toHaveBeenCalledWith({ name: 'Administrador', email: 'owner@example.org', password: PASSWORD }, { session: false });
    expect(logger.log).toHaveBeenCalledOnce();
  });

  it('does nothing without the values, and only asks for their removal once installed', async () => {
    const quiet = start({});
    await quiet.run();
    expect(quiet.access.setupRequired).not.toHaveBeenCalled();

    const installed = start({ ADMIN_BOOTSTRAP_EMAIL: 'owner@example.org', ADMIN_BOOTSTRAP_PASSWORD: PASSWORD }, { installed: true });
    await installed.run();
    expect(installed.access.initialSetup).not.toHaveBeenCalled();
    expect(installed.logger.warn).toHaveBeenCalledOnce();
  });

  it.each([
    ['a weak password', { ADMIN_BOOTSTRAP_EMAIL: 'owner@example.org', ADMIN_BOOTSTRAP_PASSWORD: 'weak-password' }, undefined, true],
    ['a missing e-mail', { ADMIN_BOOTSTRAP_PASSWORD: PASSWORD }, undefined, true],
    ['a failed installation', { ADMIN_BOOTSTRAP_EMAIL: 'owner@example.org', ADMIN_BOOTSTRAP_PASSWORD: PASSWORD }, new Error(PASSWORD), true],
    ['another instance installing first', { ADMIN_BOOTSTRAP_EMAIL: 'owner@example.org', ADMIN_BOOTSTRAP_PASSWORD: PASSWORD }, new ConflictException(), false],
  ])('never stops the start on %s, and no message carries the password', async (_case, environment, failure, reported) => {
    const { logger, run } = start(environment, { failure });
    await expect(run()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(reported ? 1 : 0);
    expect(logger.log).not.toHaveBeenCalled();
    expect(JSON.stringify([logger.error.mock.calls, logger.warn.mock.calls])).not.toContain('weak-password');
    expect(JSON.stringify([logger.error.mock.calls, logger.warn.mock.calls])).not.toContain(PASSWORD);
  });
});
