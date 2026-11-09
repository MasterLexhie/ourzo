import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services';
import type { CreateTaskDto, UpdateTaskDto } from '@/types/task.types';

export const useTasks = (
  workspaceId: string,
  projectId: string,
  params?: { status?: string; assigneeId?: string; priority?: string; page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: ['tasks', workspaceId, projectId, params],
    queryFn: () => tasksService.list(workspaceId, projectId, params),
    select: (data) => data.tasks,
    enabled: !!workspaceId && !!projectId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useTask = (workspaceId: string, taskId: string) => {
  return useQuery({
    queryKey: ['tasks', workspaceId, taskId],
    queryFn: () => tasksService.get(workspaceId, taskId),
    enabled: !!workspaceId && !!taskId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, dto }: { workspaceId: string; dto: CreateTaskDto }) =>
      tasksService.create(workspaceId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceId] });
      // Task changes affect project progress and task counts.
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, taskId, dto }: { workspaceId: string; taskId: string; dto: UpdateTaskDto }) =>
      tasksService.update(workspaceId, taskId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceId] });
      // Task changes affect project progress and task counts.
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, taskId }: { workspaceId: string; taskId: string }) =>
      tasksService.delete(workspaceId, taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceId] });
      // Task changes affect project progress and task counts.
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId] });
    },
  });
};