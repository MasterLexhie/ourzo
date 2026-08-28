import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Workspace, WorkspaceMember, User, WorkspacePlan, WorkspaceRole } from '@prisma/client';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    slug: string;
    ownerId: string;
  }) {
    return this.prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: WorkspacePlan.free,
        members: {
          create: {
            userId: data.ownerId,
            role: WorkspaceRole.owner,
          },
        },
      },
      include: {
        members: {
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
        },
      },
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { slug },
    });
  }

  async findByIdWithDeleted(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }

  async findUserOrganizations(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
        deletedAt: null,
      },
      include: {
        members: {
          where: { userId },
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
        },
        _count: {
          select: {
            projects: { where: { deletedAt: null } },
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Partial<Pick<Workspace, 'name' | 'slug'>>): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });
    return workspace !== null && workspace.id !== excludeId;
  }

  async getMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    return membership?.role ?? null;
  }

  async isOwner(workspaceId: string, userId: string): Promise<boolean> {
    const role = await this.getMemberRole(workspaceId, userId);
    return role === WorkspaceRole.owner;
  }

  async isAdminOrOwner(workspaceId: string, userId: string): Promise<boolean> {
    const role = await this.getMemberRole(workspaceId, userId);
    return role === WorkspaceRole.owner || role === WorkspaceRole.admin;
  }
}