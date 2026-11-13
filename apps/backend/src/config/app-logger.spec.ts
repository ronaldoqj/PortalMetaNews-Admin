import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLogger } from './app-logger.js';

describe('AppLogger', () => {
  afterEach(() => vi.restoreAllMocks());

  it("drops Nest's wiring announcements and keeps everything else, without colours off a terminal", () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = new AppLogger();
    logger.log('AppModule dependencies initialized', 'InstanceLoader');
    logger.log('NewsController {/panel/news}:', 'RoutesResolver');
    logger.log('Mapped {/health, GET} route', 'RouterExplorer');
    logger.log('Nest application successfully started', 'NestApplication');
    logger.warn('Orphaned attachment object requires removal', 'ReportAttachmentsService');
    const written = [...out.mock.calls, ...err.mock.calls].map(([chunk]) => String(chunk)).join('');
    expect(written).toContain('Nest application successfully started');
    expect(written).toContain('Orphaned attachment object requires removal');
    expect(written).not.toMatch(/InstanceLoader|RoutesResolver|RouterExplorer|Mapped \{/);
    if (!process.stdout.isTTY) expect(written).not.toContain('\u001b[');
  });
});
