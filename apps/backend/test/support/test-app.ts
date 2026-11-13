import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { requestValidation } from '../../src/config/request-validation.js';

/**
 * A suite's HTTP application, validating requests exactly as the API does (`requestValidation`). `listen` serves it on
 * a random local port, for suites that stream raw requests instead of going through supertest's in-process server.
 */
export async function createTestApp(module: TestingModule, options: { listen?: boolean } = {}): Promise<INestApplication> {
  const app = module.createNestApplication({ logger: false });
  app.useGlobalPipes(requestValidation());
  if (options.listen) await app.listen(0, '127.0.0.1');
  else await app.init();
  return app;
}
