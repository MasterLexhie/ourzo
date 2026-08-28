import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WorkspaceRole } from '@/authorization/roles';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerifiedAt: Date | null;
  };
  workspace?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    deletedAt: Date | null;
  };
  workspaceMembership?: {
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
  };
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);

export const CurrentWorkspace = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.workspace;
  },
);

export const CurrentWorkspaceMembership = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.workspaceMembership;
  },
);
