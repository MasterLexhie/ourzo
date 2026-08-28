export type WorkspacePlan = 'free' | 'pro' | 'business';
export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface OrganizationMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface InvitationListResponse {
  invitations: Invitation[];
}

export interface AcceptInvitationResponse {
  message: string;
  workspaceId: string;
  workspaceName: string;
}

export interface MemberResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface MemberListResponse {
  members: MemberResponse[];
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
}

export interface CreateInvitationDto {
  email: string;
  role?: WorkspaceRole;
}

export interface AcceptInvitationDto {
  token: string;
}

export interface UpdateMemberRoleDto {
  role: WorkspaceRole;
}

export interface TransferOwnershipDto {
  userId: string;
}