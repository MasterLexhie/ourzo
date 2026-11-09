import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MembersRepository } from '@/members/repositories/members.repository';
import { AuditService } from '@/audit/audit.service';
import { UsageService } from '@/usage/usage.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { TasksRepository } from './repositories/tasks.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto, TaskListResponseDto } from './dto/task-response.dto';
import {
  TaskStatus,
  TaskPriority,
  WorkspaceRole,
  ProjectStatus,
  Prisma,
  Task,
} from '@prisma/client';

interface TaskWithDetails {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  assignee: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  creator: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  project: {
    id: string;
    workspaceId: string;
    status: ProjectStatus;
    deletedAt: Date | null;
  };
}

type AuditMetadata = Prisma.InputJsonValue;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly auditService: AuditService,
    private readonly usageService: UsageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const project = await this.tasksRepository.findProjectScope(
      dto.projectId,
      workspaceId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.status === ProjectStatus.archived) {
      throw new BadRequestException(
        'Cannot create tasks in an archived project',
      );
    }

    const isProjectMember = await this.tasksRepository.isProjectMember(
      dto.projectId,
      userId,
    );

    const isWorkspaceAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    if (!isProjectMember && !isWorkspaceAdminOrOwner) {
      throw new ForbiddenException('Not a member of this project');
    }

    if (dto.assigneeId) {
      const isValidAssignee = await this.tasksRepository.isAssigneeValid(
        dto.projectId,
        dto.assigneeId,
      );
      if (!isValidAssignee) {
        throw new BadRequestException(
          'Assignee must be a member of this project',
        );
      }
    }

    await this.usageService.assertWithinLimit(workspaceId, 'tasks');

    const task = await this.tasksRepository.create({
      workspaceId,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      assigneeId: dto.assigneeId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdBy: userId,
    });

    await this.usageService.recordTaskCreated(workspaceId);

    await this.createAuditLog(
      workspaceId,
      userId,
      'task.created',
      'task',
      task.id,
      {
        title: task.title,
        projectId: dto.projectId,
        assigneeId: dto.assigneeId,
      },
    );

    if (dto.assigneeId && dto.assigneeId !== userId) {
      await this.createNotification(
        workspaceId,
        userId,
        dto.assigneeId,
        'task.assigned',
        'Task Assigned',
        `You have been assigned to task "${task.title}"`,
      );
    }

    this.logger.log(
      `Task created: ${task.id} in project ${dto.projectId} by ${userId}`,
    );

    return this.mapToResponse(task as TaskWithDetails);
  }

  async findAll(
    userId: string,
    workspaceId: string,
    projectId: string,
    options?: {
      status?: TaskStatus;
      assigneeId?: string;
      priority?: TaskPriority;
      page?: number;
      limit?: number;
    },
  ): Promise<TaskListResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const project = await this.tasksRepository.findProjectScope(
      projectId,
      workspaceId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isProjectMember = await this.tasksRepository.isProjectMember(
      projectId,
      userId,
    );

    const isWorkspaceAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    if (!isProjectMember && !isWorkspaceAdminOrOwner) {
      throw new ForbiddenException('Not a member of this project');
    }

    const { tasks, total } =
      await this.tasksRepository.findByWorkspaceAndProject(
        workspaceId,
        projectId,
        options,
      );

    return {
      tasks: tasks.map((t) => this.mapToResponse(t as TaskWithDetails)),
      total,
      page: options?.page ?? 1,
      limit: options?.limit ?? 20,
    };
  }

  async findOne(
    userId: string,
    workspaceId: string,
    taskId: string,
  ): Promise<TaskResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const task = await this.tasksRepository.findByIdWithRelations(
      taskId,
      workspaceId,
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const project = await this.tasksRepository.findProjectScope(
      task.projectId,
      workspaceId,
    );

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isProjectMember = await this.tasksRepository.isProjectMember(
      task.projectId,
      userId,
    );

    const isWorkspaceAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    if (!isProjectMember && !isWorkspaceAdminOrOwner) {
      throw new ForbiddenException('Not a member of this project');
    }

    return this.mapToResponse(task as TaskWithDetails);
  }

  async update(
    userId: string,
    workspaceId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const task = await this.tasksRepository.findByIdWithDeleted(
      taskId,
      workspaceId,
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const project = await this.tasksRepository.findProjectScope(
      task.projectId,
      workspaceId,
    );

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.status === ProjectStatus.archived) {
      throw new BadRequestException(
        'Cannot update tasks in an archived project',
      );
    }

    const isProjectMember = await this.tasksRepository.isProjectMember(
      task.projectId,
      userId,
    );

    const isWorkspaceAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    const isAssignee = task.assigneeId === userId;
    const isCreator = task.createdBy === userId;

    if (
      !isProjectMember &&
      !isWorkspaceAdminOrOwner &&
      !isAssignee &&
      !isCreator
    ) {
      throw new ForbiddenException('Not authorized to update this task');
    }

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId) {
        const isValidAssignee = await this.tasksRepository.isAssigneeValid(
          task.projectId,
          dto.assigneeId,
        );
        if (!isValidAssignee) {
          throw new BadRequestException(
            'Assignee must be a member of this project',
          );
        }
      }
    }

    const previousStatus = task.status;
    const previousAssigneeId = task.assigneeId;

    const updateData: Partial<
      Pick<
        Task,
        | 'title'
        | 'description'
        | 'status'
        | 'priority'
        | 'assigneeId'
        | 'dueDate'
      >
    > = {
      ...dto,
      dueDate: dto.dueDate
        ? new Date(dto.dueDate)
        : dto.dueDate === null
          ? null
          : undefined,
    };

    const updated = await this.tasksRepository.update(
      taskId,
      workspaceId,
      updateData,
    );
    if (!updated) {
      throw new NotFoundException('Task not found');
    }

    if (dto.status && dto.status !== previousStatus) {
      await this.createAuditLog(
        workspaceId,
        userId,
        'task.status_changed',
        'task',
        taskId,
        {
          previousStatus,
          newStatus: dto.status,
        },
      );
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== previousAssigneeId) {
      await this.createAuditLog(
        workspaceId,
        userId,
        'task.assignee_changed',
        'task',
        taskId,
        {
          previousAssigneeId,
          newAssigneeId: dto.assigneeId,
        },
      );

      if (dto.assigneeId && dto.assigneeId !== userId) {
        await this.createNotification(
          workspaceId,
          userId,
          dto.assigneeId,
          'task.assigned',
          'Task Assigned',
          `You have been assigned to task "${task.title}"`,
        );
      }
    }

    this.logger.log(`Task updated: ${taskId} by ${userId}`);

    return this.findOne(userId, workspaceId, taskId);
  }

  async delete(
    userId: string,
    workspaceId: string,
    taskId: string,
  ): Promise<{ message: string }> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const task = await this.tasksRepository.findByIdWithDeleted(
      taskId,
      workspaceId,
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const project = await this.tasksRepository.findProjectScope(
      task.projectId,
      workspaceId,
    );

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isWorkspaceAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    const isCreator = task.createdBy === userId;

    if (!isWorkspaceAdminOrOwner && !isCreator) {
      throw new ForbiddenException(
        'Only project admins/owners or task creator can delete tasks',
      );
    }

    const deleted = await this.tasksRepository.softDelete(taskId, workspaceId);
    if (!deleted) {
      throw new NotFoundException('Task not found');
    }

    await this.createAuditLog(
      workspaceId,
      userId,
      'task.deleted',
      'task',
      taskId,
      {
        title: task.title,
      },
    );

    this.logger.log(`Task deleted: ${taskId} by ${userId}`);

    return { message: 'Task deleted successfully' };
  }

  private async createAuditLog(
    workspaceId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: AuditMetadata,
  ): Promise<void> {
    await this.auditService.record({
      workspaceId,
      actorId,
      action,
      resourceType,
      resourceId,
      metadata: metadata as Record<string, unknown>,
    });
  }

  private async createNotification(
    workspaceId: string,
    actorId: string,
    userId: string,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    await this.notificationsService.notify({
      workspaceId,
      userId,
      type,
      title,
      message,
    });
  }

  private mapToResponse(task: TaskWithDetails): TaskResponseDto {
    return {
      id: task.id,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee
        ? {
            userId: task.assignee.id,
            email: task.assignee.email,
            firstName: task.assignee.firstName,
            lastName: task.assignee.lastName,
          }
        : null,
      dueDate: task.dueDate,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
