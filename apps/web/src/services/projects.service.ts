import { apiClient } from './api.client';
import type {
  Project,
  ProjectListResponse,
  ProjectProgressResponse,
  CreateProjectDto,
  UpdateProjectDto,
} from '@/types/project.types';

export const projectsService = {
  async create(workspaceId: string, dto: CreateProjectDto): Promise<Project> {
    return apiClient.post<Project>('/api/projects', dto, { workspaceId });
  },

  async list(workspaceId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ProjectListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiClient.get<ProjectListResponse>(
      `/api/projects${query ? `?${query}` : ''}`,
      { workspaceId }
    );
  },

  async get(workspaceId: string, projectId: string): Promise<Project> {
    return apiClient.get<Project>(`/api/projects/${projectId}`, { workspaceId });
  },

  async getProgress(workspaceId: string, projectId: string): Promise<ProjectProgressResponse> {
    return apiClient.get<ProjectProgressResponse>(`/api/projects/${projectId}/progress`, { workspaceId });
  },

  async update(workspaceId: string, projectId: string, dto: UpdateProjectDto): Promise<Project> {
    return apiClient.patch<Project>(`/api/projects/${projectId}`, dto, { workspaceId });
  },

  async archive(workspaceId: string, projectId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/projects/${projectId}`, { workspaceId });
  },

  async addMembers(workspaceId: string, projectId: string, userIds: string[]): Promise<Project> {
    return apiClient.post<Project>(`/api/projects/${projectId}/members`, { userIds }, { workspaceId });
  },

  async removeMember(workspaceId: string, projectId: string, userId: string): Promise<Project> {
    return apiClient.delete<Project>(`/api/projects/${projectId}/members/${userId}`, { workspaceId });
  },
};