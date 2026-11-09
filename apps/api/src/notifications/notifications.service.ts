import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import {
  NotificationResponseDto,
  NotificationListResponseDto,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async findAll(
    userId: string,
    workspaceId: string,
    options?: { read?: boolean; page?: number; limit?: number },
  ): Promise<NotificationListResponseDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const { notifications, total, unreadCount } =
      await this.notificationsRepository.findByUserAndWorkspace(
        userId,
        workspaceId,
        options,
      );

    return {
      notifications: notifications.map((n) => this.mapToResponse(n)),
      total,
      page: options?.page ?? 1,
      limit: options?.limit ?? 20,
      unreadCount,
    };
  }

  async markAsRead(
    userId: string,
    workspaceId: string,
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    // Scoped to the caller and workspace: foreign or missing ids are both 404.
    const updated = await this.notificationsRepository.markAsRead(
      notificationId,
      workspaceId,
      userId,
    );

    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    this.logger.log(
      `Notification marked as read: ${notificationId} by ${userId}`,
    );

    return this.mapToResponse(updated);
  }

  async markAllAsRead(
    userId: string,
    workspaceId: string,
  ): Promise<{ message: string; count: number }> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const count = await this.notificationsRepository.markAllAsRead(
      userId,
      workspaceId,
    );

    this.logger.log(
      `All notifications marked as read: ${count} for user ${userId} in workspace ${workspaceId}`,
    );

    return { message: 'All notifications marked as read', count };
  }

  private mapToResponse(notification: {
    id: string;
    workspaceId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationResponseDto {
    return {
      id: notification.id,
      workspaceId: notification.workspaceId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
