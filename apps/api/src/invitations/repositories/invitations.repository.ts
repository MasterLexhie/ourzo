import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Invitation,
  InvitationStatus,
  WorkspaceRole,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';

type InvitationWithWorkspace = Prisma.InvitationGetPayload<{
  include: {
    workspace: {
      select: {
        id: true;
        name: true;
        slug: true;
        deletedAt: true;
      };
    };
    inviter: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

type InvitationWithInviter = Prisma.InvitationGetPayload<{
  include: {
    inviter: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

type InvitationWithWorkspaceAndInviter = Prisma.InvitationGetPayload<{
  include: {
    workspace: {
      select: {
        id: true;
        name: true;
      };
    };
    inviter: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<InvitationWithWorkspaceAndInviter> {
    const token = randomBytes(32).toString('hex');

    return this.prisma.invitation.create({
      data: {
        ...data,
        token,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findByToken(token: string): Promise<InvitationWithWorkspace | null> {
    return this.prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            deletedAt: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findByWorkspace(workspaceId: string): Promise<InvitationWithInviter[]> {
    return this.prisma.invitation.findMany({
      where: { workspaceId },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByEmailAndWorkspace(
    email: string,
    workspaceId: string,
  ): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        status: InvitationStatus.pending,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async updateStatus(
    id: string,
    status: InvitationStatus,
    acceptedAt?: Date,
  ): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        status,
        acceptedAt,
        updatedAt: new Date(),
      },
    });
  }

  async revoke(id: string): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.revoked,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.invitation.delete({
      where: { id },
    });
  }
}
