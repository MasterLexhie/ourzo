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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto, TaskListResponseDto } from './dto/task-response.dto';
import { JwtOrApiKeyGuard } from '@/api-keys/guards/jwt-or-api-key.guard';
import { ApiKeyScopesGuard } from '@/api-keys/guards/api-key-scopes.guard';
import { RequireScopes } from '@/api-keys/decorators/require-scopes.decorator';
import { RateLimitGuard } from '@/rate-limit/rate-limit.guard';
import { RateLimit } from '@/rate-limit/decorators/rate-limit.decorator';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CurrentWorkspaceMembership } from '@/auth/decorators/current-user.decorator';
import { TaskStatus, TaskPriority } from '@prisma/client';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard, ApiKeyScopesGuard, RateLimitGuard)
@RateLimit('user')
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequireScopes('tasks:write')
  @UseGuards(WorkspaceContextGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or assignee not a project member',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(user.id, membership.workspaceId, dto);
  }

  @Get()
  @RequireScopes('tasks:read')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({
    summary: 'List tasks (filterable by project, status, assignee, priority)',
  })
  @ApiQuery({ name: 'projectId', required: true, description: 'Project ID' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'priority', enum: TaskPriority, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of tasks',
    type: TaskListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Query('projectId') projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<TaskListResponseDto> {
    return this.tasksService.findAll(
      user.id,
      membership.workspaceId,
      projectId,
      {
        status,
        assigneeId,
        priority,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      },
    );
  }

  @Get(':taskId')
  @RequireScopes('tasks:read')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'Get task details' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task details',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this project' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('taskId') taskId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(user.id, membership.workspaceId, taskId);
  }

  @Patch(':taskId')
  @RequireScopes('tasks:write')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this task',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or assignee not a project member',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(
      user.id,
      membership.workspaceId,
      taskId,
      dto,
    );
  }

  @Delete(':taskId')
  @RequireScopes('tasks:write')
  @UseGuards(WorkspaceContextGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete task (soft delete)' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Only project admins/owners or task creator can delete',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('taskId') taskId: string,
  ): Promise<{ message: string }> {
    return this.tasksService.delete(user.id, membership.workspaceId, taskId);
  }
}
