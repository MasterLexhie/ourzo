import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { ApiKeysService } from '../api-keys.service';

const KEY = `ourzo_abcdefgh_${'x'.repeat(32)}`;

const contextFor = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('ApiKeyAuthGuard', () => {
  const service = { validateKey: jest.fn() };
  const guard = new ApiKeyAuthGuard(service as unknown as ApiKeysService);

  beforeEach(() => service.validateKey.mockReset());

  it('rejects malformed keys with 401 without a lookup', async () => {
    const request = { headers: { authorization: 'Bearer ourzo_short' } };
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(service.validateKey).not.toHaveBeenCalled();
  });

  it('rejects unknown, revoked or expired keys with 401', async () => {
    service.validateKey.mockResolvedValue(null);
    const request = { headers: { authorization: `Bearer ${KEY}` } };
    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      'Invalid or revoked API key',
    );
    expect(service.validateKey).toHaveBeenCalledWith('ourzo_abcdefgh', KEY);
  });

  it('binds the request to the key workspace and acts as the key creator', async () => {
    service.validateKey.mockResolvedValue({
      id: 'key-1',
      workspaceId: 'ws-1',
      createdBy: 'user-1',
      scopes: ['projects:read'],
    });
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${KEY}` },
    };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.apiKey).toEqual({
      apiKeyId: 'key-1',
      workspaceId: 'ws-1',
      scopes: ['projects:read'],
    });
    expect(request.user).toEqual({ id: 'user-1' });
  });
});
