export type WorkspacePlan = 'free' | 'pro' | 'business';
export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface OrganizationMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  createdAt: string;
  updatedAt: string;
  members?: OrganizationMember[];
  memberCount?: number;
  projectCount?: number;
}

export interface OrganizationListResponse {
  organizations: Organization[];
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
}