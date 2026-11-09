import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
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
  method: string;
  url: string;
  apiKey?: {
    apiKeyId: string;
    workspaceId: string;
    scopes: string[];
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
  private readonly logger = new Logger(WorkspaceContextGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.logger.warn(
        `Authentication required for ${request.method} ${request.url}`,
      );
      throw new ForbiddenException('Authentication required');
    }

    const workspaceId = request.apiKey
      ? this.resolveApiKeyWorkspace(request)
      : this.extractWorkspaceId(request);

    if (!workspaceId) {
      this.logger.warn(
        `Missing workspace context for ${request.method} ${request.url} - user: ${user.id}`,
      );
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
      // For API keys this means the key's creator has since left the
      // workspace: the key no longer carries any authority.
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

  /**
   * An API key is bound to exactly one workspace. Any workspace identifier
   * supplied with the request must match it; otherwise the request is
   * rejected rather than silently re-scoped.
   */
  private resolveApiKeyWorkspace(request: RequestWithUser): string {
    const keyWorkspaceId = request.apiKey!.workspaceId;
    const supplied = [
      request.params?.workspaceId,
      request.query?.workspaceId,
      request.body?.workspaceId,
      request.headers?.['x-workspace-id'],
    ].filter((value) => value !== undefined && value !== '');

    if (supplied.some((value) => value !== keyWorkspaceId)) {
      this.logger.warn(
        `API key ${request.apiKey!.apiKeyId} used against a different workspace on ${request.method} ${request.url}`,
      );
      throw new ForbiddenException('API key is not valid for this workspace');
    }

    return keyWorkspaceId;
  }

  private extractWorkspaceId(request: RequestWithUser): string | null {
    // Check params
    const paramId = request.params?.workspaceId;
    if (paramId && this.isValidWorkspaceId(paramId)) {
      return paramId;
    }

    // Check query
    const queryId = request.query?.workspaceId;
    if (queryId && this.isValidWorkspaceId(queryId)) {
      return queryId;
    }

    // Check body
    const bodyId = request.body?.workspaceId;
    if (bodyId && this.isValidWorkspaceId(bodyId)) {
      return bodyId as string;
    }

    // Check header - handle "undefined" string, empty strings
    const headerId = request.headers?.['x-workspace-id'];
    if (headerId && this.isValidWorkspaceId(headerId)) {
      return headerId;
    }

    return null;
  }

  private isValidWorkspaceId(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
      return false;
    }
    // Basic UUID validation (optional but helpful)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed);
  }
}
