import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { AccessService } from './access.service.js';
import { BOOTSTRAP_REQUIREMENTS, bootstrapAccount } from './first-administrator.js';

/**
 * Headless installation: the same operation as the installation form of the panel's sign-in page (first account,
 * Administrador role, audited), for environments installed without a browser. The API's start does the same with the
 * values in the server's environment (`first-administrator.ts`).
 */
const account = bootstrapAccount(process.env);
if (!account) {
  console.error(`Set ${BOOTSTRAP_REQUIREMENTS} in the local environment`);
  process.exitCode = 1;
} else {
  const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    await application.get(AccessService).initialSetup(account, { session: false });
    console.info('Initial administrator created. Remove bootstrap credentials from the environment.');
  } catch {
    console.error('Unable to bootstrap the administrator. Check migrations and existing accounts.');
    process.exitCode = 1;
  } finally {
    await application.close();
  }
}
