import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AccessService } from './common/access/access.service.js';
import { installFirstAdministrator } from './common/access/first-administrator.js';
import { AppLogger } from './config/app-logger.js';
import { corsOrigins } from './config/cors-origins.js';
import { requestValidation } from './config/request-validation.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: new AppLogger() });
  // A whole article in two languages, with its SEO and captions, fits; uploads are multipart and bounded per route.
  app.useBodyParser('json', { limit: '2mb' });
  const configService = app.get(ConfigService);
  const allowedOrigins = corsOrigins(configService.getOrThrow<string>('CORS_ORIGINS'), configService.getOrThrow<string>('NODE_ENV'));

  app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));
  // Nothing the API answers is for search engines: the site's pages are the frontend's.
  app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Range'],
  });
  app.useGlobalPipes(requestValidation());
  await installFirstAdministrator(app.get(AccessService), process.env, new Logger('Installation'));
  // No global prefix: the API answers at the root of its own host (`api.<domain>`).
  await app.listen(configService.getOrThrow<number>('PORT'));
}
await bootstrap();
