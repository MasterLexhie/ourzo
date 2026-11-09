export interface AuditLogActor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditLogActor | null;
}

export interface AuditLogListResponse {
  auditLogs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilters {
  action?: string;
  resourceType?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}