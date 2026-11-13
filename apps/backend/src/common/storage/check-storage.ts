import { createStorage } from './storage.module.js';

/** `npm run storage:check`: proves the configured store answers, without storing anything. */
try {
  const storage = createStorage(process.env);
  await storage.checkConnection();
  console.info(`Storage (${storage.driver}) is reachable.`);
} catch (error) {
  console.error(`Storage check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
}
