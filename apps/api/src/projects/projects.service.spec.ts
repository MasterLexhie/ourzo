import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectStatus, WorkspaceRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './repositories/projects.repository';
import { MembersRepository } from '@/members/repositories/members.repository';
import { AuditService } from '@/audit/audit.service';
import { UsageService } from '@/usage/usage.service';
import { NotificationsService } from '@/notifications/notifications.service';

const member = (role: WorkspaceRole) => ({
  userId: 'actor',
  workspaceId: 'ws',
  role,
});

describe('ProjectsService', () => {
  const members = {
    findMembership: jest.fn(),
    findMemberUserIds: jest.fn(),
    findByWorkspace: jest.fn(),
  };
  const projects = {
    findByIdWithMembers: jest.fn(),
    findByIdWithDeleted: jest.fn(),
    softDelete: jest.fn(),
    addMember: jest.fn(),
    isMember: jest.fn(),
    create: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const usage = { assertWithinLimit: jest.fn() };
  const notifications = { notify: jest.fn(), notifyMany: jest.fn() };
  const service = new ProjectsService(
    members as unknown as MembersRepository,
    projects as unknown as ProjectsRepository,
    audit as unknown as AuditService,
    usage as unknown as UsageService,
    notifications as unknown as NotificationsService,
  );

  const project = (overrides: object = {}) => ({
    id: 'p1',
    workspaceId: 'ws',
    name: 'P',
    description: null,
    status: ProjectStatus.planned,
    startDate: null,
    targetDate: null,
    createdBy: 'actor',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    creator: { id: 'actor', email: 'a@e.test', firstName: 'A', lastName: 'A' },
    members: [],
    _count: { tasks: 0 },
    ...overrides,
  });

  beforeEach(() => jest.resetAllMocks());

  it('stops at the plan limit before creating anything', async () => {
    members.findMembership.mockResolvedValue(member(WorkspaceRole.owner));
    usage.assertWithinLimit.mockRejectedValue(
      new ForbiddenException('Project limit reached (3/3)'),
    );
    await expect(service.create('actor', 'ws', { name: 'X' })).rejects.toThrow(
      'Project limit reached (3/3)',
    );
    expect(projects.create).not.toHaveBeenCalled();
  });

  it('only owners and admins create projects', async () => {
    members.findMembership.mockResolvedValue(member(WorkspaceRole.member));
    await expect(
      service.create('actor', 'ws', { name: 'X' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects project members who are not in the workspace', async () => {
    members.findMembership.mockResolvedValue(member(WorkspaceRole.owner));
    projects.findByIdWithMembers.mockResolvedValue(project());
    members.findMemberUserIds.mockResolvedValue([]);
    await expect(
      service.addMembers('actor', 'ws', 'p1', ['outsider']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(projects.addMember).not.toHaveBeenCalled();
  });

  it('refuses membership changes on archived projects', async () => {
    members.findMembership.mockResolvedValue(member(WorkspaceRole.owner));
    projects.findByIdWithMembers.mockResolvedValue(
      project({ status: ProjectStatus.archived }),
    );
    await expect(
      service.addMembers('actor', 'ws', 'p1', ['u2']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('archive: unknown or foreign projects are 404, members are 403', async () => {
    members.findMembership.mockResolvedValue(member(WorkspaceRole.owner));
    projects.findByIdWithDeleted.mockResolvedValue(null);
    await expect(service.archive('actor', 'ws', 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(projects.findByIdWithDeleted).toHaveBeenCalledWith('p1', 'ws');

    members.findMembership.mockResolvedValue(member(WorkspaceRole.member));
    projects.findByIdWithDeleted.mockResolvedValue(project());
    await expect(service.archive('actor', 'ws', 'p1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(projects.softDelete).not.toHaveBeenCalled();
  });

  it('archive by an owner soft-deletes within the workspace and audits', async () => {
    members.findMembership.mockResolvedValue(member(WorkspaceRole.owner));
    projects.findByIdWithDeleted.mockResolvedValue(project());
    projects.softDelete.mockResolvedValue(true);
    await service.archive('actor', 'ws', 'p1');
    expect(projects.softDelete).toHaveBeenCalledWith('p1', 'ws');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'project.archived' }),
    );
  });
});
