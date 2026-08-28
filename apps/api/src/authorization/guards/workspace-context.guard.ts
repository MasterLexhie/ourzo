import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkspaceRole } from '../roles';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
  } | null;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  headers: Record<string, string | undefined>;
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

const prismaRoleToWorkspaceRole = (role: string): WorkspaceRole => {
  switch (role) {
    case 'owner':
      return WorkspaceRole.Owner;
    case 'admin':
      return WorkspaceRole.Admin;
    case 'member':
      return WorkspaceRole.Member;
    default:
      return WorkspaceRole.Member;
  }
};

@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const workspaceId = this.extractWorkspaceId(request);

    if (!workspaceId) {
      throw new ForbiddenException('Workspace context required');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (membership.workspace.deletedAt) {
      throw new NotFoundException('Workspace not found');
    }

    request.workspace = membership.workspace;
    request.workspaceMembership = {
      ...membership,
      role: prismaRoleToWorkspaceRole(membership.role),
    };

    return true;
  }

  private extractWorkspaceId(request: RequestWithUser): string | null {
    if (request.params.workspaceId) {
      return request.params.workspaceId;
    }
    if (request.query.workspaceId) {
      return request.query.workspaceId;
    }
    if (request.body.workspaceId) {
      return request.body.workspaceId as string;
    }
    if (request.headers['x-workspace-id']) {
      return request.headers['x-workspace-id'];
    }
    return null;
  }
}
