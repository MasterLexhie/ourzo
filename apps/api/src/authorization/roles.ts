export enum WorkspaceRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
}

export enum SystemRole {
  SystemAdmin = 'system_admin',
}

export const WorkspaceRoleHierarchy: Record<WorkspaceRole, number> = {
  [WorkspaceRole.Owner]: 3,
  [WorkspaceRole.Admin]: 2,
  [WorkspaceRole.Member]: 1,
};
