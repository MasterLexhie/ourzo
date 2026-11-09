import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditLog, Prisma, User } from '@prisma/client';

interface AuditLogWithActor extends AuditLog {
  actor: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'> | null;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      workspaceId: string;
      actorId: string | null;
      action: string;
      resourceType: string;
      resourceId?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    const client = tx ?? this.prisma;
    return client.auditLog.create({ data });
  }

  async findByWorkspace(
    workspaceId: string,
    options?: {
      action?: string;
      resourceType?: string;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ auditLogs: AuditLogWithActor[]; total: number }> {
    const {
      action,
      resourceType,
      actorId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options ?? {};
    const skip = (page - 1) * limit;

    const where = {
      workspaceId,
      ...(action && {
        action: { contains: action, mode: 'insensitive' as const },
      }),
      ...(resourceType && { resourceType }),
      ...(actorId && { actorId }),
      ...(startDate &&
        endDate && {
          createdAt: { gte: startDate, lte: endDate },
        }),
      ...(startDate && !endDate && { createdAt: { gte: startDate } }),
      ...(!startDate && endDate && { createdAt: { lte: endDate } }),
    };

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { auditLogs: auditLogs, total };
  }
}
