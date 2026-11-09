import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectStatus, TaskStatus, WorkspaceRole } from '@prisma/client';
import { TasksService } from './tasks.service';
import { TasksRepository } from './repositories/tasks.repository';
import { MembersRepository } from '@/members/repositories/members.repository';
import { AuditService } from '@/audit/audit.service';
import { UsageService } from '@/usage/usage.service';
import { NotificationsService } from '@/notifications/notifications.service';

describe('TasksService', () => {
  const members = { findMembership: jest.fn() };
  const tasks = {
    findProjectScope: jest.fn(),
    isProjectMember: jest.fn(),
    isAssigneeValid: jest.fn(),
    create: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const usage = { assertWithinLimit: jest.fn(), recordTaskCreated: jest.fn() };
  const notifications = { notify: jest.fn() };
  const service = new TasksService(
    members as unknown as MembersRepository,
    tasks as unknown as TasksRepository,
    audit as unknown as AuditService,
    usage as unknown as UsageService,
    notifications as unknown as NotificationsService,
  );

  const activeProject = {
    id: 'p1',
    workspaceId: 'ws',
    status: ProjectStatus.planned,
    deletedAt: null,
  };

  beforeEach(() => jest.resetAllMocks());

  it('returns 404 for projects outside the workspace (scoped lookup)', async () => {
    members.findMembership.mockResolvedValue({ role: WorkspaceRole.owner });
    tasks.findProjectScope.mockResolvedValue(null);
    await expect(
      service.create('u1', 'ws', { projectId: 'foreign', title: 'T' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tasks.findProjectScope).toHaveBeenCalledWith('foreign', 'ws');
  });

  it('workspace members outside the project cannot create tasks', async () => {
    members.findMembership.mockResolvedValue({ role: WorkspaceRole.member });
    tasks.findProjectScope.mockResolvedValue(activeProject);
    tasks.isProjectMember.mockResolvedValue(false);
    await expect(
      service.create('u1', 'ws', { projectId: 'p1', title: 'T' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tasks.create).not.toHaveBeenCalled();
  });

  it('creates blocked tasks for project members and records usage', async () => {
    members.findMembership.mockResolvedValue({ role: WorkspaceRole.member });
    tasks.findProjectScope.mockResolvedValue(activeProject);
    tasks.isProjectMember.mockResolvedValue(true);
    tasks.create.mockResolvedValue({
      id: 't1',
      workspaceId: 'ws',
      projectId: 'p1',
      title: 'T',
      status: TaskStatus.blocked,
      assignee: null,
      creator: { id: 'u1' },
    });

    const result = await service.create('u1', 'ws', {
      projectId: 'p1',
      title: 'T',
      status: TaskStatus.blocked,
    });

    expect(result.status).toBe('blocked');
    expect(tasks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws',
        status: TaskStatus.blocked,
      }),
    );
    expect(usage.recordTaskCreated).toHaveBeenCalledWith('ws');
  });

  it('task status enum has exactly the MVP values', () => {
    expect(Object.values(TaskStatus).sort()).toEqual(
      ['blocked', 'completed', 'in_progress', 'todo'].sort(),
    );
  });
});
