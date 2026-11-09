import { useQuery } from '@tanstack/react-query';
import { usageService } from '@/services';
import type { UsageResponse } from '@/types/usage.types';

export const useUsage = (workspaceId: string) => {
  return useQuery<UsageResponse>({
    queryKey: ['usage', workspaceId],
    queryFn: () => usageService.get(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
};