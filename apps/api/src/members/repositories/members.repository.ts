import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkspaceMember, WorkspaceRole, User } from '@prisma/client';

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string): Promise<
    Array<
      WorkspaceMember & {
        user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
      }
    >
  > {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  async updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    return this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    });
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  async countOwners(workspaceId: string): Promise<number> {
    return this.prisma.workspaceMember.count({
      where: { workspaceId, role: WorkspaceRole.owner },
    });
  }

  async isOwner(workspaceId: string, userId: string): Promise<boolean> {
    const membership = await this.findById(workspaceId, userId);
    return membership?.role === WorkspaceRole.owner;
  }

  async isAdminOrOwner(workspaceId: string, userId: string): Promise<boolean> {
    const membership = await this.findById(workspaceId, userId);
    return (
      membership?.role === WorkspaceRole.owner ||
      membership?.role === WorkspaceRole.admin
    );
  }
}
