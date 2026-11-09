import { ForbiddenException } from '@nestjs/common';
import { UsageService, PLAN_LIMITS } from './usage.service';
import { UsageRepository } from './repositories/usage.repository';

describe('UsageService', () => {
  const repo = {
    getWorkspacePlan: jest.fn(),
    countMembers: jest.fn(),
    countActiveProjects: jest.fn(),
    countActiveApiKeys: jest.fn(),
    getCurrentUsage: jest.fn(),
    increment: jest.fn(),
  };
  const service = new UsageService(repo as unknown as UsageRepository);
  const ws = 'ws-1';

  beforeEach(() => {
    jest.resetAllMocks();
    repo.getWorkspacePlan.mockResolvedValue('free');
    repo.countMembers.mockResolvedValue(1);
    repo.countActiveProjects.mockResolvedValue(0);
    repo.countActiveApiKeys.mockResolvedValue(0);
    repo.getCurrentUsage.mockResolvedValue(0);
  });

  it('allows creation below the plan limit', async () => {
    repo.countActiveProjects.mockResolvedValue(PLAN_LIMITS.free.projects - 1);
    await expect(
      service.assertWithinLimit(ws, 'projects'),
    ).resolves.toBeUndefined();
  });

  it('rejects at the limit with a 403 and an x/y message', async () => {
    repo.countActiveProjects.mockResolvedValue(3);
    const err = await service
      .assertWithinLimit(ws, 'projects')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).message).toBe(
      'Project limit reached (3/3)',
    );
  });

  it('uses the workspace plan, not a caller-supplied one', async () => {
    repo.getWorkspacePlan.mockResolvedValue('pro');
    repo.countActiveProjects.mockResolvedValue(3);
    await expect(
      service.assertWithinLimit(ws, 'projects'),
    ).resolves.toBeUndefined();
  });

  it('counts tasks per period from the usage table', async () => {
    repo.getCurrentUsage.mockResolvedValue(50);
    await expect(service.assertWithinLimit(ws, 'tasks')).rejects.toThrow(
      'Task limit reached (50/50)',
    );
  });

  it('defaults to the free plan when the workspace is missing', async () => {
    repo.getWorkspacePlan.mockResolvedValue(null);
    repo.countActiveApiKeys.mockResolvedValue(2);
    await expect(service.assertWithinLimit(ws, 'api_keys')).rejects.toThrow(
      'API key limit reached (2/2)',
    );
  });

  it('getUsage reports percentages and only flags exceeded when the limit is positive', async () => {
    repo.countMembers.mockResolvedValue(4);
    repo.countActiveProjects.mockResolvedValue(3);
    const usage = await service.getUsage(ws);
    const byResource = Object.fromEntries(
      usage.usage.map((u) => [u.resource, u]),
    );

    expect(usage.plan).toBe('free');
    expect(byResource.members).toMatchObject({
      current: 4,
      limit: 5,
      percentage: 80,
      warning: true,
      exceeded: false,
    });
    expect(byResource.projects).toMatchObject({
      current: 3,
      limit: 3,
      exceeded: true,
      warning: false,
    });
    expect(byResource.tasks).toMatchObject({ current: 0, exceeded: false });
  });

  it('records task creation in the current period', async () => {
    await service.recordTaskCreated(ws);
    expect(repo.increment).toHaveBeenCalledWith(
      ws,
      'tasks',
      expect.any(Date),
      expect.any(Date),
      1,
    );
  });
});
