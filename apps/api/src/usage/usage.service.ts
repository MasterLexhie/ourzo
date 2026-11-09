import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsageRepository } from './repositories/usage.repository';
import {
  UsageResponseDto,
  CheckLimitResponseDto,
  UsageItemDto,
} from './dto/usage-response.dto';
import { WorkspacePlan, UsageResource } from '@prisma/client';

export const PLAN_LIMITS: Record<
  WorkspacePlan,
  Record<UsageResource, number>
> = {
  free: {
    members: 5,
    projects: 3,
    tasks: 50,
    api_keys: 2,
  },
  pro: {
    members: 25,
    projects: 20,
    tasks: 500,
    api_keys: 10,
  },
  business: {
    members: 100,
    projects: 100,
    tasks: 5000,
    api_keys: 50,
  },
};

const WARNING_THRESHOLD = 0.8;

const RESOURCE_LABELS: Record<UsageResource, string> = {
  members: 'Member',
  projects: 'Project',
  tasks: 'Task',
  api_keys: 'API key',
};

const RESOURCES: UsageResource[] = ['members', 'projects', 'tasks', 'api_keys'];

/**
 * Plan limit semantics (see docs/architecture/usage-and-limits.md):
 * - members, projects, api_keys: current totals (live counts of active rows)
 * - tasks: created per monthly billing period (Usage table)
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  private getCurrentPeriod(): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    return { periodStart, periodEnd };
  }

  private getLimit(plan: WorkspacePlan, resource: UsageResource): number {
    return PLAN_LIMITS[plan]?.[resource] ?? 0;
  }

  private async getPlan(workspaceId: string): Promise<WorkspacePlan> {
    return (
      (await this.usageRepository.getWorkspacePlan(workspaceId)) ??
      WorkspacePlan.free
    );
  }

  private async getCurrent(
    workspaceId: string,
    resource: UsageResource,
  ): Promise<number> {
    switch (resource) {
      case 'members':
        return this.usageRepository.countMembers(workspaceId);
      case 'projects':
        return this.usageRepository.countActiveProjects(workspaceId);
      case 'api_keys':
        return this.usageRepository.countActiveApiKeys(workspaceId);
      case 'tasks': {
        const { periodStart, periodEnd } = this.getCurrentPeriod();
        return this.usageRepository.getCurrentUsage(
          workspaceId,
          'tasks',
          periodStart,
          periodEnd,
        );
      }
    }
  }

  async checkLimit(
    workspaceId: string,
    resource: UsageResource,
  ): Promise<CheckLimitResponseDto> {
    const plan = await this.getPlan(workspaceId);
    const limit = this.getLimit(plan, resource);

    if (limit <= 0) {
      return { allowed: true };
    }

    const current = await this.getCurrent(workspaceId, resource);
    const percentage = (current / limit) * 100;

    if (current >= limit) {
      return {
        allowed: false,
        message: `${RESOURCE_LABELS[resource]} limit reached (${current}/${limit})`,
        percentage,
      };
    }

    return {
      allowed: true,
      percentage,
      message:
        percentage >= WARNING_THRESHOLD * 100
          ? `Approaching ${RESOURCE_LABELS[resource]} limit (${current}/${limit})`
          : undefined,
    };
  }

  /**
   * Throws 403 when creating one more `resource` would exceed the plan limit
   * (business rule: limited operations are rejected with a clear message).
   */
  async assertWithinLimit(
    workspaceId: string,
    resource: UsageResource,
  ): Promise<void> {
    const check = await this.checkLimit(workspaceId, resource);
    if (!check.allowed) {
      throw new ForbiddenException(check.message);
    }
  }

  /** Records a period-based usage event (currently: task creation). */
  async recordTaskCreated(workspaceId: string): Promise<void> {
    const { periodStart, periodEnd } = this.getCurrentPeriod();
    await this.usageRepository.increment(
      workspaceId,
      'tasks',
      periodStart,
      periodEnd,
      1,
    );
  }

  async getUsage(workspaceId: string): Promise<UsageResponseDto> {
    const { periodStart, periodEnd } = this.getCurrentPeriod();
    const plan = await this.getPlan(workspaceId);

    const usage: UsageItemDto[] = await Promise.all(
      RESOURCES.map(async (resource) => {
        const current = await this.getCurrent(workspaceId, resource);
        const limit = this.getLimit(plan, resource);
        const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;

        return {
          resource,
          current,
          limit,
          percentage,
          warning:
            limit > 0 &&
            percentage >= WARNING_THRESHOLD * 100 &&
            current < limit,
          exceeded: limit > 0 && current >= limit,
        };
      }),
    );

    this.logger.debug(`Usage computed for workspace ${workspaceId}`);

    return {
      plan,
      usage,
      periodStart,
      periodEnd,
    };
  }
}
