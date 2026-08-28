import { apiClient } from './api.client';
import type { Organization, OrganizationListResponse, CreateOrganizationDto, UpdateOrganizationDto } from '@/types/organization.types';

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
};