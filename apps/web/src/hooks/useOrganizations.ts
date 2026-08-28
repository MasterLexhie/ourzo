import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '@/services';
import { useOrganizationStore } from '@/stores';
import type { CreateOrganizationDto, UpdateOrganizationDto } from '@/types/organization.types';

export const useOrganizations = () => {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsService.list(),
    select: (data) => data.organizations,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useOrganization = (workspaceId: string) => {
  return useQuery({
    queryKey: ['organizations', workspaceId],
    queryFn: () => organizationsService.get(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateOrganization = () => {
  const { addOrganization } = useOrganizationStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateOrganizationDto) => organizationsService.create(dto),
    onSuccess: (data) => {
      addOrganization(data);
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
};

export const useUpdateOrganization = () => {
  const { updateOrganization } = useOrganizationStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, dto }: { workspaceId: string; dto: UpdateOrganizationDto }) =>
      organizationsService.update(workspaceId, dto),
    onSuccess: (data) => {
      updateOrganization(data);
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', data.id] });
    },
  });
};

export const useDeleteOrganization = () => {
  const { removeOrganization } = useOrganizationStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => organizationsService.delete(workspaceId),
    onSuccess: (_data, workspaceId) => {
      removeOrganization(workspaceId);
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
};