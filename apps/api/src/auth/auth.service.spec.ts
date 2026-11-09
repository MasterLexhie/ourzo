import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';

const CONFIG: Record<string, string> = {
  JWT_SECRET: 'unit-access-secret-0123456789abcdef',
  JWT_REFRESH_SECRET: 'unit-refresh-secret-0123456789abcdef',
  BCRYPT_ROUNDS: '4',
};

describe('AuthService', () => {
  const repo = {
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    createRefreshToken: jest.fn(),
    findActiveRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllRefreshTokens: jest.fn(),
    findSessionUser: jest.fn(),
  };
  const config = {
    get: (key: string) => CONFIG[key],
    getOrThrow: (key: string) => CONFIG[key],
  };
  const service = new AuthService(
    repo as unknown as AuthRepository,
    new JwtService({}),
    config as unknown as ConfigService,
  );
  const user = {
    id: 'u1',
    email: 'Person@Example.test',
    firstName: 'P',
    lastName: 'Q',
    emailVerifiedAt: null,
    passwordHash: '',
  };

  beforeEach(() => jest.resetAllMocks());

  it('register stores a hashed password and a hashed refresh token only', async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    repo.createUser.mockImplementation((data: { passwordHash: string }) =>
      Promise.resolve({ ...user, ...data }),
    );

    const session = await service.register({
      email: user.email,
      password: 'Sup3r-Secret!pw',
      firstName: 'P',
      lastName: 'Q',
    });

    const created = repo.createUser.mock.calls[0] as [{ passwordHash: string }];
    expect(created[0].passwordHash).not.toContain('Sup3r-Secret!pw');
    const stored = repo.createRefreshToken.mock.calls[0] as [
      { tokenHash: string },
    ];
    expect(stored[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored[0].tokenHash).not.toBe(session.refreshToken);
    expect(JSON.stringify(session.body)).not.toContain(session.refreshToken);
    expect(session.refreshTokenMaxAgeSeconds).toBe(7 * 24 * 60 * 60);
  });

  it('refresh rotates: revokes the presented token and issues a new one', async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    repo.createUser.mockResolvedValue(user);
    const { refreshToken } = await service.register({
      email: user.email,
      password: 'Sup3r-Secret!pw',
      firstName: 'P',
      lastName: 'Q',
    });
    repo.findActiveRefreshToken.mockResolvedValue({ id: 'rt1', userId: 'u1' });

    const next = await service.refresh(refreshToken);

    expect(repo.revokeRefreshToken).toHaveBeenCalledWith('u1', 'rt1');
    expect(next.refreshToken).not.toBe(refreshToken);
    expect(next.body.accessToken).toBeTruthy();
  });

  it('refresh rejects reused, missing or wrong-type tokens', async () => {
    repo.findActiveRefreshToken.mockResolvedValue(null);
    const jwt = new JwtService({});
    const refresh = jwt.sign(
      { sub: 'u1', type: 'refresh' },
      { secret: CONFIG.JWT_REFRESH_SECRET },
    );
    const access = jwt.sign(
      { sub: 'u1', type: 'access' },
      { secret: CONFIG.JWT_REFRESH_SECRET },
    );

    await expect(service.refresh(refresh)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refresh(access)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refresh('garbage')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logout without a token revokes every session of the user', async () => {
    await service.logout('u1');
    expect(repo.revokeAllRefreshTokens).toHaveBeenCalledWith('u1');
  });

  it('failed logins are logged without the email address', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    repo.findUserByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: user.email, password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const logged = warn.mock.calls.map((c) => String(c[0])).join(' ');
    expect(logged).toContain('Failed login (unknown_user)');
    expect(logged.toLowerCase()).not.toContain(user.email.toLowerCase());
    warn.mockRestore();
  });
});
