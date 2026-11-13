import {
  Controller,
  Get,
  Header,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

/** How long the readiness check waits for the database before answering that the API is not ready. */
export const READINESS_TIMEOUT_MS = 2_000;

/**
 * Health checks for the hosting platform and uptime monitors. Public and anonymous: they read nothing about the
 * request, answer only a status word and are never cached.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  /**
   * Liveness: the process answers. The API listens only once it has connected to the database, so this also
   * means it started; it never touches the database, so a brief database outage does not get it restarted.
   */
  @Get()
  @Header('Cache-Control', 'no-store')
  live() {
    return { status: 'ok' };
  }

  /** Readiness: the database answers in time. Otherwise 503, without saying why. */
  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready() {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Database readiness timed out')),
            READINESS_TIMEOUT_MS,
          );
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    } finally {
      clearTimeout(timer);
    }
    return { status: 'ok' };
  }
}
