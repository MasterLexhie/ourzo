import { apiClient } from './api.client';
import type { UsageResponse } from '@/types/usage.types';

export const usageService = {
  async get(workspaceId: string): Promise<UsageResponse> {
    return apiClient.get<UsageResponse>('/api/usage', { workspaceId });
  },
};