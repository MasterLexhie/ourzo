import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Usage, UsageResource, WorkspacePlan } from '@prisma/client';

@Injectable()
export class UsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspacePlan(workspaceId: string): Promise<WorkspacePlan | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { plan: true },
    });
    return workspace?.plan ?? null;
  }

  async countMembers(workspaceId: string): Promise<number> {
    return this.prisma.workspaceMember.count({ where: { workspaceId } });
  }

  async countActiveProjects(workspaceId: string): Promise<number> {
    return this.prisma.project.count({
      where: { workspaceId, deletedAt: null },
    });
  }

  async countActiveApiKeys(workspaceId: string): Promise<number> {
    return this.prisma.apiKey.count({
      where: { workspaceId, revokedAt: null },
    });
  }

  async findByWorkspaceAndPeriod(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Usage[]> {
    return this.prisma.usage.findMany({
      where: {
        workspaceId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    });
  }

  async findOrCreate(
    workspaceId: string,
    resource: UsageResource,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Usage> {
    let usage = await this.prisma.usage.findFirst({
      where: {
        workspaceId,
        resource,
        periodStart,
        periodEnd,
      },
    });

    if (!usage) {
      usage = await this.prisma.usage.create({
        data: {
          workspaceId,
          resource,
          count: 0,
          periodStart,
          periodEnd,
        },
      });
    }

    return usage;
  }

  async increment(
    workspaceId: string,
    resource: UsageResource,
    periodStart: Date,
    periodEnd: Date,
    amount: number = 1,
  ): Promise<Usage> {
    return this.prisma.usage.upsert({
      where: {
        workspaceId_resource_periodStart_periodEnd: {
          workspaceId,
          resource,
          periodStart,
          periodEnd,
        },
      },
      update: {
        count: { increment: amount },
      },
      create: {
        workspaceId,
        resource,
        count: amount,
        periodStart,
        periodEnd,
      },
    });
  }

  async decrement(
    workspaceId: string,
    resource: UsageResource,
    periodStart: Date,
    periodEnd: Date,
    amount: number = 1,
  ): Promise<Usage> {
    return this.prisma.usage.update({
      where: {
        workspaceId_resource_periodStart_periodEnd: {
          workspaceId,
          resource,
          periodStart,
          periodEnd,
        },
      },
      data: {
        count: { decrement: amount },
      },
    });
  }

  async getCurrentUsage(
    workspaceId: string,
    resource: UsageResource,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const usage = await this.prisma.usage.findUnique({
      where: {
        workspaceId_resource_periodStart_periodEnd: {
          workspaceId,
          resource,
          periodStart,
          periodEnd,
        },
      },
      select: { count: true },
    });
    return Number(usage?.count ?? 0);
  }

  async getAllCurrentUsage(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Map<UsageResource, number>> {
    const usages = await this.prisma.usage.findMany({
      where: {
        workspaceId,
        periodStart,
        periodEnd,
      },
      select: { resource: true, count: true },
    });

    const map = new Map<UsageResource, number>();
    for (const u of usages) {
      map.set(u.resource, Number(u.count));
    }
    return map;
  }

  async resetMonthlyUsage(workspaceId: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    await this.prisma.usage.deleteMany({
      where: {
        workspaceId,
        periodStart: { lt: periodStart },
      },
    });
  }
}
