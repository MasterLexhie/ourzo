import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Project,
  ProjectStatus,
  ProjectMember,
  TaskStatus,
  User,
} from '@prisma/client';

interface ProjectWithRelations extends Project {
  creator: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
  members: Array<
    ProjectMember & {
      user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
    }
  >;
  _count?: {
    tasks: number;
  };
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    targetDate?: Date;
    createdBy: string;
    memberIds?: string[];
  }): Promise<ProjectWithRelations> {
    return this.prisma.project.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        status: data.status ?? ProjectStatus.planned,
        startDate: data.startDate,
        targetDate: data.targetDate,
        createdBy: data.createdBy,
        members: data.memberIds?.length
          ? {
              create: data.memberIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
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
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async findById(
    projectId: string,
    workspaceId: string,
  ): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
    });
  }

  async findByIdWithDeleted(
    projectId: string,
    workspaceId: string,
  ): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
  }

  async findByWorkspace(
    workspaceId: string,
    options?: {
      status?: ProjectStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{ projects: ProjectWithRelations[]; total: number }> {
    const { status, page = 1, limit = 20 } = options ?? {};
    const skip = (page - 1) * limit;

    const where = {
      workspaceId,
      deletedAt: null,
      ...(status && { status }),
    };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
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
          _count: {
            select: {
              tasks: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { projects: projects, total };
  }

  async findByIdWithMembers(
    projectId: string,
    workspaceId: string,
  ): Promise<ProjectWithRelations | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
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
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async update(
    projectId: string,
    workspaceId: string,
    data: Partial<
      Pick<
        Project,
        'name' | 'description' | 'status' | 'startDate' | 'targetDate'
      >
    >,
  ): Promise<boolean> {
    const { count } = await this.prisma.project.updateMany({
      where: { id: projectId, workspaceId, deletedAt: null },
      data,
    });
    return count === 1;
  }

  async softDelete(projectId: string, workspaceId: string): Promise<boolean> {
    const { count } = await this.prisma.project.updateMany({
      where: { id: projectId, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return count === 1;
  }

  async addMember(projectId: string, userId: string): Promise<ProjectMember> {
    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId,
      },
    });
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async getMembers(projectId: string): Promise<
    Array<
      ProjectMember & {
        user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
      }
    >
  > {
    return this.prisma.projectMember.findMany({
      where: { projectId },
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
    });
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });
    return membership !== null;
  }

  async getTaskCount(projectId: string, workspaceId: string): Promise<number> {
    return this.prisma.task.count({
      where: { projectId, workspaceId, deletedAt: null },
    });
  }

  async getCompletedTaskCount(
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    return this.prisma.task.count({
      where: {
        projectId,
        workspaceId,
        status: TaskStatus.completed,
        deletedAt: null,
      },
    });
  }

  async calculateProgress(
    projectId: string,
    workspaceId: string,
  ): Promise<number> {
    const [total, completed] = await Promise.all([
      this.getTaskCount(projectId, workspaceId),
      this.getCompletedTaskCount(projectId, workspaceId),
    ]);
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }
}
