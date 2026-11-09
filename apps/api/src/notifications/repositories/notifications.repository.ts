import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
    options?: {
      read?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const { read, page = 1, limit = 20 } = options ?? {};
    const skip = (page - 1) * limit;

    const where = {
      userId,
      workspaceId,
      ...(read !== undefined && { readAt: read ? { not: null } : null }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, workspaceId, readAt: null },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  async findForUser(
    notificationId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: { id: notificationId, workspaceId, userId },
    });
  }

  async markAsRead(
    notificationId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Notification | null> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id: notificationId, workspaceId, userId },
      data: { readAt: new Date() },
    });
    if (count !== 1) {
      return null;
    }
    return this.findForUser(notificationId, workspaceId, userId);
  }

  async markAllAsRead(userId: string, workspaceId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, workspaceId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async create(data: {
    workspaceId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data,
    });
  }

  async createMany(
    data: Array<{
      workspaceId: string;
      userId: string;
      type: string;
      title: string;
      message: string;
    }>,
  ): Promise<number> {
    const result = await this.prisma.notification.createMany({ data });
    return result.count;
  }
}
