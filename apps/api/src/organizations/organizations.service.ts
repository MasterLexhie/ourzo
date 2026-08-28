import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  OrganizationResponseDto,
  OrganizationListResponseDto,
  OrganizationMemberDto,
} from './dto/organization-response.dto';
import { WorkspaceRole, WorkspacePlan } from '@prisma/client';

interface WorkspaceWithMembers {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  members: Array<{
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
  _count?: {
    projects: number;
    members: number;
  };
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const slugTaken = await this.organizationsRepository.isSlugTaken(dto.slug);
    if (slugTaken) {
      throw new ConflictException('Organization slug already taken');
    }

    const workspace = await this.organizationsRepository.create({
      name: dto.name,
      slug: dto.slug,
      ownerId: userId,
    });

    this.logger.log(`Organization created: ${workspace.id} by user: ${userId}`);

    return this.mapToResponse(workspace as unknown as WorkspaceWithMembers);
  }

  async findAllForUser(userId: string): Promise<OrganizationListResponseDto> {
    const workspaces = await this.organizationsRepository.findUserOrganizations(userId);
    return {
      organizations: workspaces.map((w) => this.mapToResponse(w as unknown as WorkspaceWithMembers)),
    };
  }

  async findOne(userId: string, workspaceId: string): Promise<OrganizationResponseDto> {
    const workspace = await this.organizationsRepository.findByIdWithDeleted(workspaceId);

    if (!workspace) {
      throw new NotFoundException('Organization not found');
    }

    if (workspace.deletedAt) {
      throw new NotFoundException('Organization not found');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const fullWorkspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
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

    return this.mapToResponse(fullWorkspace! as unknown as WorkspaceWithMembers);
  }

  async update(
    userId: string,
    workspaceId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const workspace = await this.organizationsRepository.findByIdWithDeleted(workspaceId);

    if (!workspace || workspace.deletedAt) {
      throw new NotFoundException('Organization not found');
    }

    const isAdminOrOwner = await this.organizationsRepository.isAdminOrOwner(workspaceId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Insufficient permissions to update organization');
    }

    if (dto.slug) {
      const slugTaken = await this.organizationsRepository.isSlugTaken(dto.slug, workspaceId);
      if (slugTaken) {
        throw new ConflictException('Organization slug already taken');
      }
    }

    await this.organizationsRepository.update(workspaceId, dto);
    this.logger.log(`Organization updated: ${workspaceId} by user: ${userId}`);

    return this.findOne(userId, workspaceId);
  }

  async delete(userId: string, workspaceId: string): Promise<{ message: string }> {
    const workspace = await this.organizationsRepository.findByIdWithDeleted(workspaceId);

    if (!workspace || workspace.deletedAt) {
      throw new NotFoundException('Organization not found');
    }

    const isOwner = await this.organizationsRepository.isOwner(workspaceId, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only owners can delete organizations');
    }

    await this.organizationsRepository.softDelete(workspaceId);
    this.logger.log(`Organization soft deleted: ${workspaceId} by user: ${userId}`);

    return { message: 'Organization deleted successfully' };
  }

  private mapToResponse(workspace: WorkspaceWithMembers): OrganizationResponseDto {
    const members = workspace.members ?? [];
    const memberDtos: OrganizationMemberDto[] = members.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      members: memberDtos,
      memberCount: workspace._count?.members ?? members.length,
      projectCount: workspace._count?.projects ?? 0,
    };
  }
}