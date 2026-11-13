import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../../config/environment.validation.js';
import { DATABASE_MIGRATIONS } from './migrations/index.js';

const environment = validateEnvironment(process.env);
const database = new DataSource({
  type: 'postgres',
  url: environment.DATABASE_URL,
  ssl: environment.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
  migrations: DATABASE_MIGRATIONS,
  synchronize: false,
  logging: false,
});

// Runs on every start of the API (`start:prod`): replicas starting together wait here in turn, so only the first
// applies the migrations and the others find nothing left to do.
const MIGRATION_LOCK = ['portalmetanews', 'database-migrations'];

/** The operator needs the cause; PostgreSQL's code and message carry no credential, and any URL is masked. */
function failure(error: unknown): string {
  const { code, message } = error as { code?: string; message?: string };
  const cause = String(message ?? 'unknown error').replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<url>');
  return `${code ? `(${code}) ` : ''}${cause}`;
}

const lock = database.createQueryRunner();
let locked = false;

try {
  await database.initialize();
  await lock.connect();
  await lock.query('SELECT pg_advisory_lock(hashtext($1), hashtext($2))', MIGRATION_LOCK);
  locked = true;
  const migrations = await database.runMigrations({ transaction: 'all' });
  console.info(`Applied ${migrations.length} database migration(s)`);
  const installed: Array<{ exists: boolean }> = await database.query('SELECT EXISTS (SELECT 1 FROM public.users) AS exists');
  if (!installed[0].exists && !process.env.ADMIN_BOOTSTRAP_EMAIL) {
    console.info('No administrator yet: set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD for the next start, or install through the panel sign-in page.');
  }
} catch (error) {
  console.error(`Database migration failed: ${failure(error)}`);
  process.exitCode = 1;
} finally {
  try {
    if (locked) await lock.query('SELECT pg_advisory_unlock(hashtext($1), hashtext($2))', MIGRATION_LOCK);
  } finally {
    if (database.isInitialized && !lock.isReleased) await lock.release();
    if (database.isInitialized) await database.destroy();
  }
}
