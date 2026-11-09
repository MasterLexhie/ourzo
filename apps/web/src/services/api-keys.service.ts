import { apiClient } from './api.client';
import type {
  ApiKey,
  ApiKeyListResponse,
  CreateApiKeyResponse,
  CreateApiKeyDto,
} from '@/types/api-key.types';

export const apiKeysService = {
  async create(workspaceId: string, dto: CreateApiKeyDto): Promise<CreateApiKeyResponse> {
    return apiClient.post<CreateApiKeyResponse>('/api/api-keys', dto, { workspaceId });
  },

  async list(workspaceId: string): Promise<ApiKeyListResponse> {
    return apiClient.get<ApiKeyListResponse>('/api/api-keys', { workspaceId });
  },

  async get(workspaceId: string, keyId: string): Promise<ApiKey> {
    return apiClient.get<ApiKey>(`/api/api-keys/${keyId}`, { workspaceId });
  },

  async revoke(workspaceId: string, keyId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/api-keys/${keyId}`, { workspaceId });
  },
};