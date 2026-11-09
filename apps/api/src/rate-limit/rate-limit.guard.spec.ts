import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const service = { checkLimit: jest.fn() };
  const config = { get: jest.fn() };
  const guard = new RateLimitGuard(
    reflector as unknown as Reflector,
    service as unknown as RateLimitService,
    config as unknown as ConfigService,
  );
  const headers: Record<string, string> = {};
  const response = { setHeader: (k: string, v: string) => (headers[k] = v) };

  const contextFor = (request: object): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    for (const k of Object.keys(headers)) delete headers[k];
  });

  it('is a no-op without @RateLimit metadata', async () => {
    await expect(guard.canActivate(contextFor({}))).resolves.toBe(true);
    expect(service.checkLimit).not.toHaveBeenCalled();
  });

  it('limits auth routes per IP, fails closed, and reads limits from env', async () => {
    reflector.getAllAndOverride.mockReturnValue({ policy: 'auth' });
    config.get.mockImplementation((key: string) =>
      key === 'RATE_LIMIT_AUTH_MAX' ? '7' : undefined,
    );
    service.checkLimit.mockResolvedValue({
      allowed: true,
      remaining: 6,
      resetInSeconds: 60,
      total: 7,
    });

    await guard.canActivate(contextFor({ ip: '10.0.0.1', user: { id: 'u' } }));
    expect(service.checkLimit).toHaveBeenCalledWith(
      'ip:10.0.0.1',
      { keyPrefix: 'auth', maxRequests: 7, windowMs: 60000 },
      true,
    );
    expect(headers['X-RateLimit-Remaining']).toBe('6');
  });

  it('switches to the per-key policy for API-key requests', async () => {
    reflector.getAllAndOverride.mockReturnValue({ policy: 'user' });
    service.checkLimit.mockResolvedValue({
      allowed: true,
      remaining: 1,
      resetInSeconds: 60,
      total: 120,
    });

    await guard.canActivate(
      contextFor({
        user: { id: 'u' },
        apiKey: { apiKeyId: 'k1', workspaceId: 'w', scopes: [] },
      }),
    );
    expect(service.checkLimit).toHaveBeenCalledWith(
      'apikey:k1',
      expect.objectContaining({ keyPrefix: 'api-key', maxRequests: 120 }),
      false,
    );
  });

  it('throws 429 with Retry-After when the limit is exceeded', async () => {
    reflector.getAllAndOverride.mockReturnValue({ policy: 'user' });
    service.checkLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 42,
      total: 300,
    });

    const err = await guard
      .canActivate(contextFor({ user: { id: 'u' } }))
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect(headers['Retry-After']).toBe('42');
  });
});
