import { apiClient } from './api.client';
import type { NotificationListResponse } from '@/types/notification.types';

export const notificationsService = {
  async list(workspaceId: string, params?: {
    read?: boolean;
    page?: number;
    limit?: number;
  }): Promise<NotificationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.read !== undefined) searchParams.append('read', params.read.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiClient.get<NotificationListResponse>(
      `/api/notifications${query ? `?${query}` : ''}`,
      { workspaceId }
    );
  },

  async markAsRead(workspaceId: string, notificationId: string): Promise<void> {
    return apiClient.patch(`/api/notifications/${notificationId}/read`, {}, { workspaceId });
  },

  async markAllAsRead(workspaceId: string): Promise<{ message: string; count: number }> {
    return apiClient.patch(`/api/notifications/read-all`, {}, { workspaceId });
  },
};