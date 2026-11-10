import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyScopesGuard } from './api-key-scopes.guard';

const contextFor = (request: object): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

describe('ApiKeyScopesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new ApiKeyScopesGuard(reflector as unknown as Reflector);
  const key = { apiKeyId: 'k', workspaceId: 'w', scopes: ['projects:read'] };

  beforeEach(() => reflector.getAllAndOverride.mockReset());

  it('ignores JWT (non-key) requests entirely', () => {
    reflector.getAllAndOverride.mockReturnValue(['projects:write']);
    expect(guard.canActivate(contextFor({}))).toBe(true);
  });

  it('denies key requests to routes without declared scopes', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(() => guard.canActivate(contextFor({ apiKey: key }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows keys holding every required scope', () => {
    reflector.getAllAndOverride.mockReturnValue(['projects:read']);
    expect(guard.canActivate(contextFor({ apiKey: key }))).toBe(true);
  });

  it('rejects keys missing a required scope', () => {
    reflector.getAllAndOverride.mockReturnValue(['projects:write']);
    expect(() => guard.canActivate(contextFor({ apiKey: key }))).toThrow(
      'Insufficient API key scopes. Required: projects:write',
    );
  });
});
