export type WorkspacePlan = 'free' | 'pro' | 'business';
export type UsageResource = 'members' | 'projects' | 'tasks' | 'api_keys';

export interface UsageItem {
  resource: UsageResource;
  current: number;
  limit: number;
  percentage: number;
  warning: boolean;
  exceeded: boolean;
}

export interface UsageResponse {
  plan: WorkspacePlan;
  usage: UsageItem[];
  periodStart: string;
  periodEnd: string;
}

export interface CheckLimitResponse {
  allowed: boolean;
  message?: string;
  percentage?: number;
}