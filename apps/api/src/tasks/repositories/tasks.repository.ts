import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Task, TaskStatus, TaskPriority, User } from '@prisma/client';

interface TaskWithRelations extends Task {
  assignee: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'> | null;
  creator: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
}

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    workspaceId: string;
    projectId: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    dueDate?: Date;
    createdBy: string;
  }): Promise<TaskWithRelations> {
    return this.prisma.task.create({
      data: {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status ?? TaskStatus.todo,
        priority: data.priority ?? TaskPriority.medium,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        createdBy: data.createdBy,
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        creator: {
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

  async findById(taskId: string, workspaceId: string): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
    });
  }

  async findByIdWithDeleted(
    taskId: string,
    workspaceId: string,
  ): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });
  }

  async findByWorkspaceAndProject(
    workspaceId: string,
    projectId: string,
    options?: {
      status?: TaskStatus;
      assigneeId?: string;
      priority?: TaskPriority;
      page?: number;
      limit?: number;
    },
  ): Promise<{ tasks: TaskWithRelations[]; total: number }> {
    const {
      status,
      assigneeId,
      priority,
      page = 1,
      limit = 20,
    } = options ?? {};
    const skip = (page - 1) * limit;

    const where = {
      workspaceId,
      projectId,
      deletedAt: null,
      ...(status && { status }),
      ...(assigneeId && { assigneeId }),
      ...(priority && { priority }),
    };

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { tasks: tasks, total };
  }

  async findByIdWithRelations(
    taskId: string,
    workspaceId: string,
  ): Promise<TaskWithRelations | null> {
    return this.prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        creator: {
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

  async update(
    taskId: string,
    workspaceId: string,
    data: Partial<
      Pick<
        Task,
        | 'title'
        | 'description'
        | 'status'
        | 'priority'
        | 'assigneeId'
        | 'dueDate'
      >
    >,
  ): Promise<Task | null> {
    const { count } = await this.prisma.task.updateMany({
      where: { id: taskId, workspaceId, deletedAt: null },
      data,
    });
    if (count !== 1) {
      return null;
    }
    return this.findById(taskId, workspaceId);
  }

  async softDelete(taskId: string, workspaceId: string): Promise<boolean> {
    const { count } = await this.prisma.task.updateMany({
      where: { id: taskId, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return count === 1;
  }

  async isAssigneeValid(projectId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });
    return membership !== null;
  }
}
