import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services';
import type { CreateProjectDto, UpdateProjectDto } from '@/types/project.types';

export const useProjects = (workspaceId: string, params?: { status?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['projects', workspaceId, params],
    queryFn: () => projectsService.list(workspaceId, params),
    select: (data) => data.projects,
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
};

/** Total number of active projects in the workspace (cheap: fetches one row). */
export const useProjectTotal = (workspaceId: string) => {
  return useQuery({
    queryKey: ['projects', workspaceId, { limit: 1 }],
    queryFn: () => projectsService.list(workspaceId, { limit: 1 }),
    select: (data) => data.total,
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
};

export const useProject = (workspaceId: string, projectId: string) => {
  return useQuery({
    queryKey: ['projects', workspaceId, projectId],
    queryFn: () => projectsService.get(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProjectProgress = (workspaceId: string, projectId: string) => {
  return useQuery({
    queryKey: ['projects', workspaceId, projectId, 'progress'],
    queryFn: () => projectsService.getProgress(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
    staleTime: 30 * 1000,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, dto }: { workspaceId: string; dto: CreateProjectDto }) =>
      projectsService.create(workspaceId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, projectId, dto }: { workspaceId: string; projectId: string; dto: UpdateProjectDto }) =>
      projectsService.update(workspaceId, projectId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId, variables.projectId] });
    },
  });
};

export const useAddProjectMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, projectId, userIds }: { workspaceId: string; projectId: string; userIds: string[] }) =>
      projectsService.addMembers(workspaceId, projectId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, projectId, userId }: { workspaceId: string; projectId: string; userId: string }) =>
      projectsService.removeMember(workspaceId, projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useArchiveProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, projectId }: { workspaceId: string; projectId: string }) =>
      projectsService.archive(workspaceId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};