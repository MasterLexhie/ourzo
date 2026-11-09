import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ApiKey } from '@prisma/client';

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    workspaceId: string;
    createdBy: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    scopes: string[];
    expiresAt?: Date;
  }): Promise<ApiKey> {
    return this.prisma.apiKey.create({
      data: {
        workspaceId: data.workspaceId,
        createdBy: data.createdBy,
        name: data.name,
        keyPrefix: data.keyPrefix,
        keyHash: data.keyHash,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findById(id: string, workspaceId: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findFirst({
      where: { id, workspaceId },
    });
  }

  async countActive(workspaceId: string): Promise<number> {
    return this.prisma.apiKey.count({
      where: { workspaceId, revokedAt: null },
    });
  }

  async findByPrefix(keyPrefix: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findFirst({
      where: { keyPrefix },
    });
  }

  async findByWorkspace(workspaceId: string): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { workspaceId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllWithRevoked(workspaceId: string): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, workspaceId: string): Promise<boolean> {
    const { count } = await this.prisma.apiKey.updateMany({
      where: { id, workspaceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count === 1;
  }

  async updateLastUsed(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
