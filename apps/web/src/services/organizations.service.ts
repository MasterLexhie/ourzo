import { apiClient } from './api.client';
import type {
  Organization,
  OrganizationListResponse,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  Invitation,
  InvitationListResponse,
  AcceptInvitationResponse,
  CreateInvitationDto,
  AcceptInvitationDto,
  MemberListResponse,
  MemberResponse,
  UpdateMemberRoleDto,
  TransferOwnershipDto,
} from '@/types/organization.types';

export const organizationsService = {
  async create(dto: CreateOrganizationDto): Promise<Organization> {
    return apiClient.post<Organization>('/api/organizations', dto);
  },

  async list(): Promise<OrganizationListResponse> {
    return apiClient.get<OrganizationListResponse>('/api/organizations');
  },

  async get(workspaceId: string): Promise<Organization> {
    return apiClient.get<Organization>(`/api/organizations/${workspaceId}`);
  },

  async update(workspaceId: string, dto: UpdateOrganizationDto): Promise<Organization> {
    return apiClient.patch<Organization>(`/api/organizations/${workspaceId}`, dto);
  },

  async delete(workspaceId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/organizations/${workspaceId}`);
  },

  // Invitations
  async listInvitations(workspaceId: string): Promise<InvitationListResponse> {
    return apiClient.get<InvitationListResponse>(`/api/invitations`, { workspaceId });
  },

  async createInvitation(workspaceId: string, dto: CreateInvitationDto): Promise<Invitation> {
    return apiClient.post<Invitation>(`/api/invitations`, dto, { workspaceId });
  },

  async acceptInvitation(dto: AcceptInvitationDto): Promise<AcceptInvitationResponse> {
    return apiClient.post<AcceptInvitationResponse>(`/api/invitations/accept`, dto);
  },

  async revokeInvitation(workspaceId: string, invitationId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/invitations/${invitationId}`, { workspaceId });
  },

  // Members
  async listMembers(workspaceId: string): Promise<MemberListResponse> {
    return apiClient.get<MemberListResponse>(`/api/members`, { workspaceId });
  },

  async updateMemberRole(workspaceId: string, userId: string, dto: UpdateMemberRoleDto): Promise<MemberResponse> {
    return apiClient.patch<MemberResponse>(`/api/members/${userId}/role`, dto, { workspaceId });
  },

  async removeMember(workspaceId: string, userId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/members/${userId}`, { workspaceId });
  },

  async transferOwnership(workspaceId: string, dto: TransferOwnershipDto): Promise<MemberResponse> {
    return apiClient.post<MemberResponse>(`/api/members/transfer-ownership`, dto, { workspaceId });
  },
};