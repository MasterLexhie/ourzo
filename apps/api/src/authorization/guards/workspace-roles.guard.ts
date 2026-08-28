import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole, WorkspaceRoleHierarchy } from '../roles';
import { WORKSPACE_ROLES_KEY } from '@/authorization';

interface RequestWithWorkspaceMembership {
  workspaceMembership: {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: Date;
    updatedAt: Date;
    workspace: {
      id: string;
      name: string;
      slug: string;
      plan: string;
      deletedAt: Date | null;
    };
  } | null;
}

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithWorkspaceMembership>();
    const membership = request.workspaceMembership;

    if (!membership) {
      throw new ForbiddenException('Workspace membership required');
    }

    const userRole = membership.role;

    const userRoleLevel = WorkspaceRoleHierarchy[userRole] ?? 0;
    const hasRequiredRole = requiredRoles.some(
      (role) => WorkspaceRoleHierarchy[role] <= userRoleLevel,
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
