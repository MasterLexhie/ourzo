import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { getRequestContext } from '@/common/request-context';
import { MembersRepository } from '@/members/repositories/members.repository';
import { AuditRepository } from './repositories/audit.repository';
import {
  AuditLogResponseDto,
  AuditLogListResponseDto,
} from './dto/audit-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  /**
   * Single entry point for writing tenant audit events (append-only).
   * Requests authenticated with an API key are tagged `via: 'api_key'`.
   */
  async record(
    entry: {
      workspaceId: string;
      actorId: string | null;
      action: string;
      resourceType: string;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const apiKeyId = getRequestContext()?.apiKeyId;
    const metadata = {
      ...(entry.metadata ?? {}),
      ...(apiKeyId ? { via: 'api_key', apiKeyId } : {}),
    } as Prisma.InputJsonValue;

    await this.auditRepository.create(
      {
        workspaceId: entry.workspaceId,
        actorId: entry.actorId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        metadata,
      },
      tx,
    );
  }

  async findAll(
    userId: string,
    workspaceId: string,
    options?: {
      action?: string;
      resourceType?: string;
      actorId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<AuditLogListResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new ForbiddenException(
        'Only owners and admins can view audit logs',
      );
    }

    const { auditLogs, total } = await this.auditRepository.findByWorkspace(
      workspaceId,
      {
        action: options?.action,
        resourceType: options?.resourceType,
        actorId: options?.actorId,
        startDate: options?.startDate ? new Date(options.startDate) : undefined,
        endDate: options?.endDate ? new Date(options.endDate) : undefined,
        page: options?.page,
        limit: options?.limit,
      },
    );

    return {
      auditLogs: auditLogs.map((log) => this.mapToResponse(log)),
      total,
      page: options?.page ?? 1,
      limit: options?.limit ?? 20,
    };
  }

  private mapToResponse(log: {
    id: string;
    workspaceId: string;
    actorId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    actor: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null;
  }): AuditLogResponseDto {
    return {
      id: log.id,
      workspaceId: log.workspaceId,
      actorId: log.actorId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      metadata: log.metadata,
      createdAt: log.createdAt,
      actor: log.actor
        ? {
            id: log.actor.id,
            email: log.actor.email,
            firstName: log.actor.firstName,
            lastName: log.actor.lastName,
          }
        : null,
    };
  }
}
