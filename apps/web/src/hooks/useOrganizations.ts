import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '@/services';
import { useOrganizationStore } from '@/stores';
import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  CreateInvitationDto,
  AcceptInvitationDto,
  UpdateMemberRoleDto,
  TransferOwnershipDto,
} from '@/types/organization.types';

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

// Invitations
export const useInvitations = (workspaceId: string) => {
  return useQuery({
    queryKey: ['invitations', workspaceId],
    queryFn: () => organizationsService.listInvitations(workspaceId),
    select: (data) => data.invitations,
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, dto }: { workspaceId: string; dto: CreateInvitationDto }) =>
      organizationsService.createInvitation(workspaceId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', variables.workspaceId] });
    },
  });
};

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: (dto: AcceptInvitationDto) => organizationsService.acceptInvitation(dto),
  });
};

export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, invitationId }: { workspaceId: string; invitationId: string }) =>
      organizationsService.revokeInvitation(workspaceId, invitationId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', variables.workspaceId] });
    },
  });
};

// Members
export const useMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => organizationsService.listMembers(workspaceId),
    select: (data) => data.members,
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
      dto,
    }: {
      workspaceId: string;
      userId: string;
      dto: UpdateMemberRoleDto;
    }) => organizationsService.updateMemberRole(workspaceId, userId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.workspaceId] });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      organizationsService.removeMember(workspaceId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.workspaceId] });
    },
  });
};

export const useTransferOwnership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, dto }: { workspaceId: string; dto: TransferOwnershipDto }) =>
      organizationsService.transferOwnership(workspaceId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', variables.workspaceId] });
    },
  });
};