import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  NotificationResponseDto,
  NotificationListResponseDto,
} from './dto/notification-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '@/rate-limit/rate-limit.guard';
import { RateLimit } from '@/rate-limit/decorators/rate-limit.decorator';
import { WorkspaceContextGuard } from '@/authorization/guards/workspace-context.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CurrentWorkspaceMembership } from '@/auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit('user')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'List notifications for current user in workspace' })
  @ApiQuery({
    name: 'read',
    required: false,
    description: 'Filter by read status',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of notifications',
    type: NotificationListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Query('read') read?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsService.findAll(user.id, membership.workspaceId, {
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Patch(':notificationId/read')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(
      user.id,
      membership.workspaceId,
      notificationId,
    );
  }

  @Patch('read-all')
  @UseGuards(WorkspaceContextGuard)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  @ApiResponse({ status: 403, description: 'Not a member of this workspace' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(
    @CurrentUser() user: { id: string },
    @CurrentWorkspaceMembership() membership: { workspaceId: string },
  ): Promise<{ message: string; count: number }> {
    return this.notificationsService.markAllAsRead(
      user.id,
      membership.workspaceId,
    );
  }
}
