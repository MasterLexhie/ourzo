import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/bcrypt';
import { createHash, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './repositories/auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuthResponseDto,
  IssuedSession,
  TokenResponseDto,
} from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<IssuedSession<AuthResponseDto>> {
    const existingUser = await this.authRepository.findUserByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const session = this.generateTokens(user.id);
    await this.storeRefreshToken(user.id, session.refreshToken);

    this.logger.log(`User registered: ${user.id}`);

    return { ...session, body: this.buildAuthResponse(user, session.body) };
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<IssuedSession<AuthResponseDto>> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user) {
      this.logFailedLogin(dto.email, 'unknown_user');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.verifyPassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.logFailedLogin(dto.email, 'bad_password');
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = this.generateTokens(user.id);
    await this.storeRefreshToken(
      user.id,
      session.refreshToken,
      userAgent,
      ipAddress,
    );

    this.logger.log(`User logged in: ${user.id}`);

    return { ...session, body: this.buildAuthResponse(user, session.body) };
  }

  /**
   * Rotates a refresh token: the presented token is revoked and a new pair is
   * issued, so a replayed (stolen) token fails after its first use.
   */
  async refresh(
    refreshToken: string | undefined,
  ): Promise<IssuedSession<TokenResponseDto>> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload = await this.verifyRefreshToken(refreshToken);

    const storedToken = await this.authRepository.findActiveRefreshToken(
      payload.sub,
      await this.hashToken(refreshToken),
    );

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepository.revokeRefreshToken(payload.sub, storedToken.id);

    const session = this.generateTokens(payload.sub);
    await this.storeRefreshToken(payload.sub, session.refreshToken);

    return session;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = await this.hashToken(refreshToken);
      const storedToken = await this.authRepository.findActiveRefreshToken(
        userId,
        tokenHash,
      );
      if (storedToken) {
        await this.authRepository.revokeRefreshToken(userId, storedToken.id);
      }
    } else {
      await this.authRepository.revokeAllRefreshTokens(userId);
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  async validateUser(userId: string) {
    const user = await this.authRepository.findSessionUser(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateTokens(userId: string): IssuedSession<TokenResponseDto> {
    const accessTokenExpiry =
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY') ?? '15m';
    const refreshTokenExpiry =
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY') ?? '7d';

    const accessToken = this.jwtService.sign(
      // jti makes every token unique, even when issued within the same second.
      { sub: userId, type: 'access', jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessTokenExpiry as JwtSignOptions['expiresIn'],
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh', jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiry as JwtSignOptions['expiresIn'],
      },
    );

    return {
      body: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.parseExpiryToSeconds(accessTokenExpiry),
      },
      refreshToken,
      refreshTokenMaxAgeSeconds: this.parseExpiryToSeconds(
        refreshTokenExpiry,
        7 * 24 * 60 * 60,
      ),
    };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    const tokenHash = await this.hashToken(refreshToken);
    const decoded = this.jwtService.decode<{ exp?: number } | null>(
      refreshToken,
    );
    const exp = decoded?.exp;

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash,
      userAgent,
      ipAddress,
      expiresAt: exp
        ? new Date(exp * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; type: string }> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        type: string;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return payload;
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = Number(
      this.configService.get<number>('BCRYPT_ROUNDS') ?? 12,
    );
    return hash(password, rounds);
  }

  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return verify(password, hash);
  }

  /**
   * Refresh tokens are high-entropy JWTs, so a deterministic SHA-256 digest is
   * sufficient and, unlike salted bcrypt, allows lookup by hash.
   */
  /**
   * Failed logins have no tenant, so they go to the app log rather than the
   * workspace audit log. The email is pseudonymised and no IP or credential
   * values are written.
   */
  private logFailedLogin(email: string, reason: string): void {
    const emailRef = createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex')
      .slice(0, 12);
    this.logger.warn(`Failed login (${reason}) emailRef=${emailRef}`);
  }

  private hashToken(token: string): Promise<string> {
    return Promise.resolve(createHash('sha256').update(token).digest('hex'));
  }

  private parseExpiryToSeconds(expiry: string, fallback = 900): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return fallback;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return fallback;
    }
  }

  private buildAuthResponse(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      emailVerifiedAt: Date | null;
    },
    tokens: TokenResponseDto,
  ): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      tokens,
    };
  }
}
