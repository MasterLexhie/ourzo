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
import { ProjectsRepository } from './repositories/projects.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ProjectResponseDto,
  ProjectListResponseDto,
  ProjectProgressResponseDto,
} from './dto/project-response.dto';
import { ProjectStatus, WorkspaceRole, Prisma, Project } from '@prisma/client';

interface ProjectWithDetails {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  targetDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  creator: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  members: Array<{
    id: string;
    projectId: string;
    userId: string;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
  _count?: {
    tasks: number;
  };
}

type AuditMetadata = Prisma.InputJsonValue;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly auditService: AuditService,
    private readonly usageService: UsageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (
      membership.role !== WorkspaceRole.owner &&
      membership.role !== WorkspaceRole.admin
    ) {
      throw new ForbiddenException(
        'Only owners and admins can create projects',
      );
    }

    await this.usageService.assertWithinLimit(workspaceId, 'projects');

    if (dto.memberIds?.length) {
      await this.assertWorkspaceMembers(workspaceId, dto.memberIds);
    }

    // The creator is always a project member so they keep access to it
    // regardless of later role changes.
    const memberIds = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));

    const project = await this.projectsRepository.create({
      workspaceId,
      name: dto.name,
      description: dto.description,
      status: dto.status,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      createdBy: userId,
      memberIds,
    });

    await this.createAuditLog(
      workspaceId,
      userId,
      'project.created',
      'project',
      project.id,
      {
        name: project.name,
        status: project.status,
      },
    );

    await this.createNotification(
      workspaceId,
      userId,
      'project.created',
      'Project Created',
      `Project "${project.name}" has been created.`,
    );

    this.logger.log(
      `Project created: ${project.id} in workspace ${workspaceId} by ${userId}`,
    );

    return this.mapToResponse(project);
  }

  async findAll(
    userId: string,
    workspaceId: string,
    options?: { status?: ProjectStatus; page?: number; limit?: number },
  ): Promise<ProjectListResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const { projects, total } = await this.projectsRepository.findByWorkspace(
      workspaceId,
      options,
    );

    return {
      projects: projects.map((p) => this.mapToResponse(p)),
      total,
      page: options?.page ?? 1,
      limit: options?.limit ?? 20,
    };
  }

  async findOne(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const project = await this.projectsRepository.findByIdWithMembers(
      projectId,
      workspaceId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isProjectMember = await this.projectsRepository.isMember(
      projectId,
      userId,
    );
    const isWorkspaceAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    if (!isProjectMember && !isWorkspaceAdminOrOwner) {
      throw new ForbiddenException('Not a member of this project');
    }

    return this.mapToResponse(project);
  }

  async update(
    userId: string,
    workspaceId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const project = await this.projectsRepository.findByIdWithDeleted(
      projectId,
      workspaceId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    if (!isAdminOrOwner) {
      throw new ForbiddenException(
        'Only owners and admins can update projects',
      );
    }

    const previousStatus = project.status;

    const updateData: Partial<
      Pick<
        Project,
        'name' | 'description' | 'status' | 'startDate' | 'targetDate'
      >
    > = {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
    };

    const updated = await this.projectsRepository.update(
      projectId,
      workspaceId,
      updateData,
    );
    if (!updated) {
      throw new NotFoundException('Project not found');
    }

    if (dto.status && dto.status !== previousStatus) {
      await this.createAuditLog(
        workspaceId,
        userId,
        'project.status_changed',
        'project',
        projectId,
        {
          previousStatus,
          newStatus: dto.status,
        },
      );
    }

    this.logger.log(`Project updated: ${projectId} by ${userId}`);

    return this.findOne(userId, workspaceId, projectId);
  }

  async archive(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<{ message: string }> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const project = await this.projectsRepository.findByIdWithDeleted(
      projectId,
      workspaceId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    const isAdminOrOwner =
      membership.role === WorkspaceRole.owner ||
      membership.role === WorkspaceRole.admin;

    if (!isAdminOrOwner) {
      throw new ForbiddenException(
        'Only owners and admins can archive projects',
      );
    }

    const archived = await this.projectsRepository.softDelete(
      projectId,
      workspaceId,
    );
    if (!archived) {
      throw new NotFoundException('Project not found');
    }

    await this.createAuditLog(
      workspaceId,
      userId,
      'project.archived',
      'project',
      projectId,
      {
        name: project.name,
      },
    );

    this.logger.log(`Project archived: ${projectId} by ${userId}`);

    return { message: 'Project archived successfully' };
  }

  async getProgress(
    userId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectProgressResponseDto> {
    await this.findOne(userId, workspaceId, projectId);

    const [totalTasks, completedTasks] = await Promise.all([
      this.projectsRepository.getTaskCount(projectId, workspaceId),
      this.projectsRepository.getCompletedTaskCount(projectId, workspaceId),
    ]);

    const progress =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      progress,
      totalTasks,
      completedTasks,
    };
  }

  async addMembers(
    actorId: string,
    workspaceId: string,
    projectId: string,
    userIds: string[],
  ): Promise<ProjectResponseDto> {
    await this.assertCanManageProjectMembers(actorId, workspaceId);
    const project = await this.getManageableProject(workspaceId, projectId);

    const uniqueUserIds = Array.from(new Set(userIds));
    await this.assertWorkspaceMembers(workspaceId, uniqueUserIds);

    const existing = new Set(project.members.map((m) => m.userId));
    const toAdd = uniqueUserIds.filter((id) => !existing.has(id));

    for (const userId of toAdd) {
      await this.projectsRepository.addMember(projectId, userId);
      await this.createAuditLog(
        workspaceId,
        actorId,
        'project.member_added',
        'project',
        projectId,
        { userId },
      );
      await this.notifyUser(
        workspaceId,
        userId,
        'project.member_added',
        'Added to Project',
        `You were added to project "${project.name}".`,
      );
    }

    this.logger.log(
      `Project ${projectId}: added ${toAdd.length} member(s) by ${actorId}`,
    );

    return this.getProjectResponse(workspaceId, projectId);
  }

  async removeMember(
    actorId: string,
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectResponseDto> {
    await this.assertCanManageProjectMembers(actorId, workspaceId);
    const project = await this.getManageableProject(workspaceId, projectId);

    if (!project.members.some((m) => m.userId === userId)) {
      throw new NotFoundException('User is not a member of this project');
    }

    await this.projectsRepository.removeMember(projectId, userId);
    await this.createAuditLog(
      workspaceId,
      actorId,
      'project.member_removed',
      'project',
      projectId,
      { userId },
    );

    this.logger.log(
      `Project ${projectId}: removed member ${userId} by ${actorId}`,
    );

    return this.getProjectResponse(workspaceId, projectId);
  }

  /** Throws 400 if any of the given users is not a member of the workspace. */
  private async assertWorkspaceMembers(
    workspaceId: string,
    userIds: string[],
  ): Promise<void> {
    const validMemberIds = new Set(
      await this.membersRepository.findMemberUserIds(workspaceId, userIds),
    );
    const invalidIds = userIds.filter((id) => !validMemberIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `The following users are not members of this workspace: ${invalidIds.join(', ')}`,
      );
    }
  }

  /** Defence in depth: the route guard already restricts to Owner/Admin. */
  private async assertCanManageProjectMembers(
    actorId: string,
    workspaceId: string,
  ): Promise<void> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      actorId,
    );

    if (
      !membership ||
      (membership.role !== WorkspaceRole.owner &&
        membership.role !== WorkspaceRole.admin)
    ) {
      throw new ForbiddenException(
        'Only owners and admins can manage project members',
      );
    }
  }

  /**
   * Loads a project for membership changes. Missing, deleted and foreign
   * projects all return the same 404 so IDs from other workspaces are not
   * disclosed. Archived projects are read-only (business rule #33).
   */
  private async getManageableProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectWithDetails> {
    const project = await this.projectsRepository.findByIdWithMembers(
      projectId,
      workspaceId,
    );

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.status === ProjectStatus.archived) {
      throw new BadRequestException(
        'Cannot change members of an archived project',
      );
    }

    return project;
  }

  private async getProjectResponse(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsRepository.findByIdWithMembers(
      projectId,
      workspaceId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.mapToResponse(project);
  }

  private async notifyUser(
    workspaceId: string,
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
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    const members = await this.membersRepository.findByWorkspace(workspaceId);

    await this.notificationsService.notifyMany(
      members.map((m) => ({
        workspaceId,
        userId: m.userId,
        type,
        title,
        message,
      })),
    );
  }

  private mapToResponse(project: ProjectWithDetails): ProjectResponseDto {
    const members = project.members ?? [];
    const memberDtos = members.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
    }));

    const taskCount = project._count?.tasks ?? 0;

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      targetDate: project.targetDate,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      members: memberDtos,
      taskCount,
      progress: 0, // Will be computed separately via getProgress endpoint
    };
  }
}
