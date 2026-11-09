import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { MembersService } from './members.service';
import { MembersRepository } from './repositories/members.repository';
import { AuditService } from '@/audit/audit.service';

const membership = (userId: string, role: WorkspaceRole) => ({
  id: `m-${userId}`,
  workspaceId: 'ws',
  userId,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('MembersService role rules', () => {
  const repo = {
    findMembership: jest.fn(),
    findById: jest.fn(),
    updateRole: jest.fn(),
    remove: jest.fn(),
    countOwners: jest.fn(),
    findUserProfile: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const service = new MembersService(
    repo as unknown as MembersRepository,
    audit as unknown as AuditService,
  );

  const as = (actor: WorkspaceRole, target?: WorkspaceRole) => {
    repo.findMembership.mockResolvedValue(membership('actor', actor));
    repo.findById.mockResolvedValue(
      target ? membership('target', target) : null,
    );
  };

  beforeEach(() => jest.resetAllMocks());

  it('members cannot change roles', async () => {
    as(WorkspaceRole.member, WorkspaceRole.member);
    await expect(
      service.updateRole('actor', 'ws', 'target', {
        role: WorkspaceRole.admin,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.updateRole).not.toHaveBeenCalled();
  });

  it('nobody can change their own role', async () => {
    repo.findMembership.mockResolvedValue(
      membership('actor', WorkspaceRole.owner),
    );
    repo.findById.mockResolvedValue(membership('actor', WorkspaceRole.owner));
    await expect(
      service.updateRole('actor', 'ws', 'actor', { role: WorkspaceRole.admin }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('admins cannot promote anyone to owner', async () => {
    as(WorkspaceRole.admin, WorkspaceRole.member);
    await expect(
      service.updateRole('actor', 'ws', 'target', {
        role: WorkspaceRole.owner,
      }),
    ).rejects.toThrow('Admins cannot assign owner role');
  });

  it('admins cannot modify other admins', async () => {
    as(WorkspaceRole.admin, WorkspaceRole.admin);
    await expect(
      service.updateRole('actor', 'ws', 'target', {
        role: WorkspaceRole.member,
      }),
    ).rejects.toThrow('Admins cannot modify other admins');
  });

  it("an owner's role cannot be changed directly", async () => {
    as(WorkspaceRole.owner, WorkspaceRole.owner);
    await expect(
      service.updateRole('actor', 'ws', 'target', {
        role: WorkspaceRole.member,
      }),
    ).rejects.toThrow('Cannot change the role of an owner');
  });

  it('owners can change a member role and the change is audited', async () => {
    as(WorkspaceRole.owner, WorkspaceRole.member);
    repo.updateRole.mockResolvedValue(
      membership('target', WorkspaceRole.admin),
    );
    repo.findUserProfile.mockResolvedValue({
      id: 'target',
      email: 't@example.test',
      firstName: 'T',
      lastName: 'T',
    });
    await service.updateRole('actor', 'ws', 'target', {
      role: WorkspaceRole.admin,
    });
    expect(repo.updateRole).toHaveBeenCalledWith(
      'ws',
      'target',
      WorkspaceRole.admin,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'member.role_changed',
        resourceId: 'target',
      }),
    );
  });

  it('returns 404 for users outside the workspace', async () => {
    as(WorkspaceRole.owner);
    await expect(
      service.updateRole('actor', 'ws', 'target', {
        role: WorkspaceRole.admin,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the last owner cannot be removed and owners cannot remove themselves', async () => {
    repo.findMembership.mockResolvedValue(
      membership('actor', WorkspaceRole.owner),
    );
    repo.findById.mockResolvedValue(membership('actor', WorkspaceRole.owner));
    repo.countOwners.mockResolvedValue(1);
    await expect(
      service.removeMember('actor', 'ws', 'actor'),
    ).rejects.toThrow();
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
