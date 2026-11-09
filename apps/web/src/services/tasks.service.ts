import { apiClient } from './api.client';
import type {
  Task,
  TaskListResponse,
  CreateTaskDto,
  UpdateTaskDto,
} from '@/types/task.types';

export const tasksService = {
  async create(workspaceId: string, dto: CreateTaskDto): Promise<Task> {
    return apiClient.post<Task>('/api/tasks', dto, { workspaceId });
  },

  async list(workspaceId: string, projectId: string, params?: {
    status?: string;
    assigneeId?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<TaskListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('projectId', projectId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.assigneeId) searchParams.append('assigneeId', params.assigneeId);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiClient.get<TaskListResponse>(`/api/tasks?${searchParams.toString()}`, { workspaceId });
  },

  async get(workspaceId: string, taskId: string): Promise<Task> {
    return apiClient.get<Task>(`/api/tasks/${taskId}`, { workspaceId });
  },

  async update(workspaceId: string, taskId: string, dto: UpdateTaskDto): Promise<Task> {
    return apiClient.patch<Task>(`/api/tasks/${taskId}`, dto, { workspaceId });
  },

  async delete(workspaceId: string, taskId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/tasks/${taskId}`, { workspaceId });
  },
};