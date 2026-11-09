import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeysService } from '@/services';
import type { CreateApiKeyDto, ApiKeyListResponse } from '@/types/api-key.types';

export const useApiKeys = (workspaceId: string) => {
  return useQuery<ApiKeyListResponse>({
    queryKey: ['api-keys', workspaceId],
    queryFn: () => apiKeysService.list(workspaceId),
    select: (data) => data,
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useApiKey = (workspaceId: string, keyId: string) => {
  return useQuery({
    queryKey: ['api-keys', workspaceId, keyId],
    queryFn: () => apiKeysService.get(workspaceId, keyId),
    enabled: !!workspaceId && !!keyId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, dto }: { workspaceId: string; dto: CreateApiKeyDto }) =>
      apiKeysService.create(workspaceId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', variables.workspaceId] });
    },
  });
};

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, keyId }: { workspaceId: string; keyId: string }) =>
      apiKeysService.revoke(workspaceId, keyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', variables.workspaceId] });
    },
  });
};