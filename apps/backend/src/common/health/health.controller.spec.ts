import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { HealthController, READINESS_TIMEOUT_MS } from './health.controller.js';

function controller(query: () => Promise<unknown>) {
  const dataSource = { query: vi.fn(query) };
  return {
    health: new HealthController(dataSource as unknown as DataSource),
    dataSource,
  };
}

describe('HealthController', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers liveness without touching the database', () => {
    const { health, dataSource } = controller(() => Promise.resolve([]));
    expect(health.live()).toEqual({ status: 'ok' });
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('is ready when the database answers', async () => {
    const { health, dataSource } = controller(() =>
      Promise.resolve([{ '?column?': 1 }]),
    );
    await expect(health.ready()).resolves.toEqual({ status: 'ok' });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('answers 503 without the cause when the database fails', async () => {
    const { health } = controller(() =>
      Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432')),
    );
    const failure = await health.ready().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as ServiceUnavailableException).getResponse()).toEqual({
      status: 'unavailable',
    });
  });

  it('answers 503 when the database does not answer in time', async () => {
    vi.useFakeTimers();
    const { health } = controller(() => new Promise(() => undefined));
    const pending = health.ready().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(READINESS_TIMEOUT_MS);
    expect(await pending).toBeInstanceOf(ServiceUnavailableException);
  });
});
