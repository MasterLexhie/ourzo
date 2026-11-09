import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RefreshToken, User } from '@prisma/client';

export type SessionUser = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'emailVerifiedAt'
>;

/** Persistence for platform identities (users) and refresh-token sessions. */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findSessionUser(userId: string): Promise<SessionUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
      },
    });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  /** An unrevoked, unexpired refresh token of the user matching the hash. */
  async findActiveRefreshToken(
    userId: string,
    tokenHash: string,
  ): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
