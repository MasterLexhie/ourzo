import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services';
import type { NotificationListResponse } from '@/types/notification.types';

export const useNotifications = (workspaceId: string, params?: { read?: boolean; page?: number; limit?: number }) => {
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications', workspaceId, params],
    queryFn: () => notificationsService.list(workspaceId, params),
    select: (data) => data,
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
};

export const useUnreadNotificationCount = (workspaceId: string) => {
  return useQuery<NotificationListResponse>({
    queryKey: ['notifications', workspaceId, { read: false, limit: 1 }],
    queryFn: () => notificationsService.list(workspaceId, { read: false, limit: 1 }),
    select: (data) => data,
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, notificationId }: { workspaceId: string; notificationId: string }) =>
      notificationsService.markAsRead(workspaceId, notificationId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.workspaceId] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => notificationsService.markAllAsRead(workspaceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables] });
    },
  });
};