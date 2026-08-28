import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto, AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    const tokens = this.generateTokens(user.id);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User registered: ${user.id}`);

    return this.buildAuthResponse(user, tokens);
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.verifyPassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user.id);
    await this.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      userAgent,
      ipAddress,
    );

    this.logger.log(`User logged in: ${user.id}`);

    return this.buildAuthResponse(user, tokens);
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: await this.hashToken(dto.refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.revokeRefreshToken(storedToken.id);

    const tokens = this.generateTokens(payload.sub);
    await this.storeRefreshToken(payload.sub, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = await this.hashToken(refreshToken);
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: { userId, tokenHash, revokedAt: null },
      });
      if (storedToken) {
        await this.revokeRefreshToken(storedToken.id);
      }
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateTokens(userId: string): TokenResponseDto {
    const accessTokenExpiry =
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY') ?? '15m';
    const refreshTokenExpiry =
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY') ?? '7d';

    const accessToken = this.jwtService.sign(
      { sub: userId, type: 'access' },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresIn: accessTokenExpiry as any,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresIn: refreshTokenExpiry as any,
      },
    );

    const expiresIn = this.parseExpiryToSeconds(accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    const tokenHash = await this.hashToken(refreshToken);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decoded = this.jwtService.decode(refreshToken);
    const exp = (decoded as { exp?: number } | null)?.exp;

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        userAgent,
        ipAddress,
        expiresAt: exp
          ? new Date(exp * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; type: string }> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
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

  private async hashToken(token: string): Promise<string> {
    const rounds = Number(
      this.configService.get<number>('BCRYPT_ROUNDS') ?? 12,
    );
    return hash(token, rounds);
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
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
        return 900;
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
