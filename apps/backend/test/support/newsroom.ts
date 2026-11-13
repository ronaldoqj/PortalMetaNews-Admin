import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { StorageService } from '../../src/common/storage/storage.service.js';
import { MemoryStorage } from './memory-storage.js';
import { createTestApp } from './test-app.js';
import { createTestDatabase, type TestDatabase } from './test-database.js';

export const PASSWORD = 'Newsroom-Test-2026!';

/**
 * A whole API on a throwaway database with storage in memory and the local AI provider: an installed panel with one
 * account per system role, each with a session. Suites call the API over HTTP, as the frontend's server does.
 */
export interface Newsroom {
  app: INestApplication;
  db: TestDatabase;
  storage: MemoryStorage;
  tokens: Record<'admin' | 'editor' | 'reporter' | 'reviewer', string>;
  ids: Record<'admin' | 'editor' | 'reporter' | 'reviewer', string>;
  api: (role: keyof Newsroom['tokens'] | null) => {
    get: (path: string) => request.Test; post: (path: string) => request.Test; patch: (path: string) => request.Test;
    put: (path: string) => request.Test; delete: (path: string) => request.Test;
  };
  close: () => Promise<void>;
}

export async function createNewsroom(): Promise<Newsroom> {
  const db = await createTestDatabase();
  const storage = new MemoryStorage();
  const previous = { DATABASE_URL: process.env.DATABASE_URL, GEMINI_API_KEY: process.env.GEMINI_API_KEY, SCHEDULER: process.env.SCHEDULER };
  process.env.DATABASE_URL = db.url;
  process.env.GEMINI_API_KEY = '';
  process.env.SCHEDULER = 'false';
  let module: TestingModule;
  try {
    // `ConfigModule.forRoot` reads the environment when the application module is first evaluated: it must be imported
    // only now, pointed at the throwaway database, never at the development one.
    const { AppModule } = await import('../../src/app.module.js');
    module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(StorageService).useValue(storage).compile();
    const configured = module.get(ConfigService).get<string>('DATABASE_URL');
    if (configured !== db.url) throw new Error('The test application is not pointed at the throwaway database');
  } finally {
    Object.assign(process.env, previous);
  }
  const app = await createTestApp(module);
  const server = app.getHttpServer();
  const install = await request(server).post('/auth/initial-setup').send({ name: 'Admin', email: 'admin@test.example', password: PASSWORD }).expect(201);
  const tokens = { admin: install.body.token as string } as Newsroom['tokens'];
  const ids = { admin: install.body.actor.userId as string } as Newsroom['ids'];
  const roles = (await request(server).get('/panel/team/roles').set('Authorization', `Bearer ${tokens.admin}`).expect(200)).body as Array<{ id: string; slug: string }>;
  for (const role of ['editor', 'reporter', 'reviewer'] as const) {
    const created = await request(server).post('/panel/team/users').set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: role, email: `${role}@test.example`, roleId: roles.find((candidate) => candidate.slug === role)!.id }).expect(201);
    ids[role] = created.body.id;
    const challenge = await request(server).post('/auth/login').send({ email: `${role}@test.example`, password: created.body.temporaryPassword }).expect(200);
    const session = await request(server).post('/auth/force-password-change').send({ temporaryToken: challenge.body.temporaryToken, newPassword: PASSWORD }).expect(200);
    tokens[role] = session.body.token;
  }
  const api: Newsroom['api'] = (role) => {
    const authorize = (test: request.Test) => (role ? test.set('Authorization', `Bearer ${tokens[role]}`) : test);
    return {
      get: (path) => authorize(request(server).get(path)), post: (path) => authorize(request(server).post(path)),
      patch: (path) => authorize(request(server).patch(path)), put: (path) => authorize(request(server).put(path)),
      delete: (path) => authorize(request(server).delete(path)),
    };
  };
  return { app, db, storage, tokens, ids, api, close: async () => { await app.close(); await db.drop(); } };
}
