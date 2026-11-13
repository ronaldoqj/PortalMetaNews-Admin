import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NewsService } from './news.service.js';

const INTERVAL_MS = 30_000;

/**
 * Publishes scheduled news when their time comes. One instance runs it (`SCHEDULER=true`); the update itself only
 * takes items still scheduled, so two instances running at once never publish one twice.
 */
@Injectable()
export class NewsSchedulerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NewsSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(NewsService) private readonly news: NewsService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get<string>('SCHEDULER') === 'false' || this.config.get<string>('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
    void this.tick();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const published = await this.news.publishDue();
      if (published) this.logger.log(`Published ${published} scheduled news item(s)`);
    } catch {
      this.logger.warn('Scheduled publication failed; it is retried on the next tick');
    } finally {
      this.running = false;
    }
  }
}
