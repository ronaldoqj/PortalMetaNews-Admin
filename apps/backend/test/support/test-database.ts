import { randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import { describe } from 'vitest';
import { DATABASE_MIGRATIONS } from '../../src/common/database/migrations/index.js';

/** A suite that needs PostgreSQL: it runs only under `npm run test:database` (`PMN_DATABASE_TESTS=1`). */
export function describeWithDatabase(name: string, suite: () => void): void {
  describe.skipIf(process.env.PMN_DATABASE_TESTS !== '1')(name, suite);
}

export interface TestDatabase {
  database: DataSource;
  /** The connection string of the throwaway database, for an application booted against it. */
  url: string;
  /** Closes the connections and drops the database; safe after a failed creation and when called twice. */
  drop(): Promise<void>;
}

/**
 * A throwaway database for one suite on the local Docker PostgreSQL, with every migration applied. Refuses any server
 * but a local one, so a misconfigured DATABASE_URL never reaches a real database.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Database integration tests require local Docker PostgreSQL');
  }
  const name = `pmn_test_${randomBytes(8).toString('hex')}`;
  const admin = new DataSource({ type: 'postgres', url: url.toString(), logging: false });
  await admin.initialize();
  let created = false;
  let database: DataSource | undefined;
  const drop = async () => {
    try {
      if (database?.isInitialized) await database.destroy();
    } finally {
      try {
        if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
        created = false;
      } finally {
        if (admin.isInitialized) await admin.destroy();
      }
    }
  };
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    url.pathname = `/${name}`;
    database = new DataSource({ type: 'postgres', url: url.toString(), logging: false, synchronize: false, migrations: DATABASE_MIGRATIONS });
    await database.initialize();
    await database.runMigrations({ transaction: 'all' });
    return { database, url: url.toString(), drop };
  } catch (error) {
    await drop();
    throw error;
  }
}
