import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, WorkspaceMember, WorkspaceRole, User } from '@prisma/client';

export type UserProfile = Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Runs `fn` atomically; repository methods accept the `tx` client. */
  withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** The caller's membership in a workspace, or null. Used for every tenant check. */
  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  /** Which of `userIds` belong to the workspace. */
  async findMemberUserIds(
    workspaceId: string,
    userIds: string[],
  ): Promise<string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { in: userIds } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async isEmailMember(workspaceId: string, email: string): Promise<boolean> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email } },
      select: { id: true },
    });
    return member !== null;
  }

  async addMember(
    data: { workspaceId: string; userId: string; role: WorkspaceRole },
    tx?: Prisma.TransactionClient,
  ): Promise<WorkspaceMember> {
    return (tx ?? this.prisma).workspaceMember.create({ data });
  }

  async setRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkspaceMember> {
    return (tx ?? this.prisma).workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    });
  }

  async findUserProfile(userId: string): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
  }

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
