import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services';
import type { AuditLogListResponse, AuditLogFilters } from '@/types/audit.types';

export const useAuditLogs = (workspaceId: string, filters?: AuditLogFilters) => {
  return useQuery<AuditLogListResponse>({
    queryKey: ['audit', workspaceId, filters],
    queryFn: () => auditService.list(workspaceId, filters),
    select: (data) => data,
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
};