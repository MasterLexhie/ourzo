import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMembersDto } from './dto/add-project-members.dto';
import {
  ProjectResponseDto,
  ProjectListResponseDto,
  ProjectProgressResponseDto,
} from './dto/project-response.dto';
import { JwtOrApiKeyGuard } from '@/api-keys/guards/jwt-or-api-key.guard';
import { ApiKeyScopesGuard } from '@/api-keys/guards/api-key-scopes.guard';
import { RequireScopes } from '@/api-keys/decorators/require-scopes.decorator';
import { RateLimitGuard } from '@/rate-limit/rate-limit.guard';
import { RateLimit } from '@/rate-limit/decorators/rate-limit.decorator';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { WorkspaceRolesGuard } from '@/authorization/guards/workspace-roles.guard';
import { WorkspaceRoles } from '@/authorization/decorators/workspace-roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CurrentWorkspaceMembership } from '@/auth/decorators/current-user.decorator';
import { WorkspaceRole } from '@/authorization/roles';
import { ProjectStatus } from '@prisma/client';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard, ApiKeyScopesGuard, RateLimitGuard)
@RateLimit('user')
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequireScopes('projects:write')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(user.id, membership.workspaceId, dto);
  }

  @Get()
  @RequireScopes('projects:read')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'List all projects in the workspace' })
  @ApiQuery({ name: 'status', enum: ProjectStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of projects',
    type: ProjectListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Query('status') status?: ProjectStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ProjectListResponseDto> {
    return this.projectsService.findAll(user.id, membership.workspaceId, {
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':projectId')
  @RequireScopes('projects:read')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project details',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(
      user.id,
      membership.workspaceId,
      projectId,
    );
  }

  @Get(':projectId/progress')
  @RequireScopes('projects:read')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'Get project progress' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project progress',
    type: ProjectProgressResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProgress(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('projectId') projectId: string,
  ): Promise<ProjectProgressResponseDto> {
    return this.projectsService.getProgress(
      user.id,
      membership.workspaceId,
      projectId,
    );
  }

  @Patch(':projectId')
  @RequireScopes('projects:write')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @ApiOperation({ summary: 'Update project details' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(
      user.id,
      membership.workspaceId,
      projectId,
      dto,
    );
  }

  @Delete(':projectId')
  @RequireScopes('projects:write')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive project (soft delete)' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project archived successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async archive(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('projectId') projectId: string,
  ): Promise<{ message: string }> {
    return this.projectsService.archive(
      user.id,
      membership.workspaceId,
      projectId,
    );
  }

  @Post(':projectId/members')
  @RequireScopes('projects:write')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add workspace members to a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Members added; returns the updated project',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User not in workspace, or project archived',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addMembers(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddProjectMembersDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.addMembers(
      user.id,
      membership.workspaceId,
      projectId,
      dto.userIds,
    );
  }

  @Delete(':projectId/members/:userId')
  @RequireScopes('projects:write')
  @UseGuards(WorkspaceContextGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.Owner, WorkspaceRole.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({
    status: 200,
    description: 'Member removed; returns the updated project',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Project archived' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Project or member not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeMember(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.removeMember(
      user.id,
      membership.workspaceId,
      projectId,
      userId,
    );
  }
}
