import { ExecutionContext } from '@nestjs/common';
import { JwtOrApiKeyGuard } from './jwt-or-api-key.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

const contextWith = (authorization?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  }) as unknown as ExecutionContext;

describe('JwtOrApiKeyGuard', () => {
  const jwt = { canActivate: jest.fn().mockReturnValue('jwt') };
  const apiKey = { canActivate: jest.fn().mockReturnValue('key') };
  const guard = new JwtOrApiKeyGuard(
    jwt as unknown as JwtAuthGuard,
    apiKey as unknown as ApiKeyAuthGuard,
  );

  beforeEach(() => jest.clearAllMocks());

  it('routes ourzo_ bearer tokens to API-key authentication', () => {
    expect(guard.canActivate(contextWith('Bearer ourzo_abcdefgh_xyz'))).toBe(
      'key',
    );
    expect(jwt.canActivate).not.toHaveBeenCalled();
  });

  it('routes every other bearer token to JWT authentication', () => {
    expect(
      guard.canActivate(contextWith('Bearer eyJhbGciOi.payload.sig')),
    ).toBe('jwt');
    expect(apiKey.canActivate).not.toHaveBeenCalled();
  });

  it('routes missing or non-bearer credentials to JWT (which rejects them)', () => {
    expect(guard.canActivate(contextWith(undefined))).toBe('jwt');
    expect(guard.canActivate(contextWith('Basic ourzo_abcdefgh_xyz'))).toBe(
      'jwt',
    );
  });
});
