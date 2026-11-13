import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

/** The whole API boots from its real module, with every provider wired, against the local environment. */
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('answers its health checks at the root of its own host, with nothing else there', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/').expect(404);
  });

  it('closes its host to crawlers', async () => {
    await request(app.getHttpServer())
      .get('/robots.txt')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect('User-agent: *\nDisallow: /\n');
  });
});
