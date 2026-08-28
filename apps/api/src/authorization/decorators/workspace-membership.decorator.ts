import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WorkspaceRole } from '../roles';

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
  };
}

export const WorkspaceMembership = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithWorkspaceMembership>();
    return request.workspaceMembership;
  },
);
