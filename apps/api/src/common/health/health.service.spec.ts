import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import Redis from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn() }));

const RedisMock = Redis as unknown as jest.Mock;

/** A fake ioredis client whose connect/ping behaviour each test controls. */
function fakeRedis(behaviour: {
  connect?: () => Promise<void>;
  ping?: () => Promise<string>;
}) {
  return {
    on: jest.fn(),
    connect: jest.fn(behaviour.connect ?? (() => Promise.resolve())),
    ping: jest.fn(behaviour.ping ?? (() => Promise.resolve('PONG'))),
    disconnect: jest.fn(),
  };
}

describe('HealthService', () => {
  const prisma = { checkConnection: jest.fn() };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const service = new HealthService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.useRealTimers();
    prisma.checkConnection.mockReset();
    RedisMock.mockReset();
  });

  it('is ok only when the database query succeeds and Redis answers PONG', async () => {
    prisma.checkConnection.mockResolvedValue(true);
    const redis = fakeRedis({});
    RedisMock.mockImplementation(() => redis);

    const report = await service.getHealth();

    expect(report.status).toBe('ok');
    expect(report.checks.database.status).toBe('up');
    expect(report.checks.redis.status).toBe('up');
    expect(redis.disconnect).toHaveBeenCalled();
  });

  it('is unavailable when the database query fails', async () => {
    prisma.checkConnection.mockResolvedValue(false);
    RedisMock.mockImplementation(() => fakeRedis({}));

    const report = await service.getHealth();

    expect(report.status).toBe('unavailable');
    expect(report.checks.database.status).toBe('down');
    expect(report.checks.redis.status).toBe('up');
  });

  it('is unavailable when Redis cannot be reached', async () => {
    prisma.checkConnection.mockResolvedValue(true);
    const redis = fakeRedis({
      connect: () => Promise.reject(new Error('ECONNREFUSED')),
    });
    RedisMock.mockImplementation(() => redis);

    const report = await service.getHealth();

    expect(report.status).toBe('unavailable');
    expect(report.checks.redis.status).toBe('down');
    expect(redis.disconnect).toHaveBeenCalled();
  });

  it('is unavailable when Redis replies with something other than PONG', async () => {
    prisma.checkConnection.mockResolvedValue(true);
    RedisMock.mockImplementation(() =>
      fakeRedis({ ping: () => Promise.resolve('LOADING') }),
    );

    const report = await service.getHealth();

    expect(report.checks.redis.status).toBe('down');
    expect(report.status).toBe('unavailable');
  });

  it('marks a hung dependency down instead of hanging the health check', async () => {
    jest.useFakeTimers();
    prisma.checkConnection.mockReturnValue(new Promise(() => undefined));
    RedisMock.mockImplementation(() =>
      fakeRedis({ ping: () => new Promise(() => undefined) }),
    );

    const pending = service.getHealth();
    await jest.advanceTimersByTimeAsync(3000);
    const report = await pending;

    expect(report.status).toBe('unavailable');
    expect(report.checks.database.status).toBe('down');
    expect(report.checks.redis.status).toBe('down');
  });
});

describe('HealthController', () => {
  const report = (status: 'ok' | 'unavailable') => ({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'up' as const, latencyMs: 1 },
      redis: { status: 'up' as const, latencyMs: 1 },
    },
  });

  it.each([
    ['ok', 200],
    ['unavailable', 503],
  ] as const)('responds %s with HTTP %i', async (status, httpStatus) => {
    const healthService = {
      getHealth: jest.fn().mockResolvedValue(report(status)),
    };
    const res = { status: jest.fn() };
    const controller = new HealthController(
      healthService as unknown as HealthService,
    );

    const body = await controller.health(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(httpStatus);
    expect(body.status).toBe(status);
  });
});
