import { apiClient } from './api.client';
import type { AuditLogListResponse, AuditLogFilters } from '@/types/audit.types';

export const auditService = {
  async list(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLogListResponse> {
    const searchParams = new URLSearchParams();
    if (filters?.action) searchParams.append('action', filters.action);
    if (filters?.resourceType) searchParams.append('resourceType', filters.resourceType);
    if (filters?.actorId) searchParams.append('actorId', filters.actorId);
    if (filters?.startDate) searchParams.append('startDate', filters.startDate);
    if (filters?.endDate) searchParams.append('endDate', filters.endDate);
    if (filters?.page) searchParams.append('page', filters.page.toString());
    if (filters?.limit) searchParams.append('limit', filters.limit.toString());
    const query = searchParams.toString();
    return apiClient.get<AuditLogListResponse>(
      `/api/audit${query ? `?${query}` : ''}`,
      { workspaceId }
    );
  },
};