import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { InvitationsRepository } from './repositories/invitations.repository';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import {
  InvitationResponseDto,
  InvitationListResponseDto,
  AcceptInvitationResponseDto,
} from './dto/invitation-response.dto';
import { InvitationStatus, WorkspaceRole, Prisma } from '@prisma/client';
import { addDays } from 'date-fns';

interface InvitationWithRelations {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workspace: {
    id: string;
    name: string;
    slug: string;
    deletedAt: Date | null;
  };
  inviter: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

type AuditMetadata = Prisma.InputJsonValue;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitationsRepository: InvitationsRepository,
  ) {}

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (
      membership.role !== WorkspaceRole.owner &&
      membership.role !== WorkspaceRole.admin
    ) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email: dto.email },
      },
      include: { user: true },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const existingInvitation =
      await this.invitationsRepository.findPendingByEmailAndWorkspace(
        dto.email,
        workspaceId,
      );

    if (existingInvitation) {
      throw new ConflictException(
        'An active invitation already exists for this email',
      );
    }

    const expiresAt = addDays(new Date(), this.EXPIRY_DAYS);

    const invitation = await this.invitationsRepository.create({
      workspaceId,
      email: dto.email,
      role: dto.role ?? WorkspaceRole.member,
      invitedBy: userId,
      expiresAt,
    });

    await this.createAuditLog(
      workspaceId,
      userId,
      'invitation.created',
      'invitation',
      invitation.id,
      {
        email: dto.email,
        role: dto.role ?? WorkspaceRole.member,
      },
    );

    this.logger.log(
      `Invitation created: ${invitation.id} for ${dto.email} in workspace ${workspaceId}`,
    );

    return this.mapToResponse(invitation as InvitationWithRelations);
  }

  async findAllForWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<InvitationListResponseDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (
      membership.role !== WorkspaceRole.owner &&
      membership.role !== WorkspaceRole.admin
    ) {
      throw new ForbiddenException(
        'Only owners and admins can view invitations',
      );
    }

    const invitations =
      await this.invitationsRepository.findByWorkspace(workspaceId);

    return {
      invitations: invitations.map((inv) =>
        this.mapToResponse(inv as InvitationWithRelations),
      ),
    };
  }

  async accept(
    dto: AcceptInvitationDto,
    userId: string,
  ): Promise<AcceptInvitationResponseDto> {
    const invitation = await this.invitationsRepository.findByToken(dto.token);

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.pending) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      await this.invitationsRepository.updateStatus(
        invitation.id,
        InvitationStatus.expired,
      );
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.workspace.deletedAt) {
      throw new NotFoundException('Workspace not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== invitation.email) {
      throw new ForbiddenException(
        'This invitation is for a different email address',
      );
    }

    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invitation.workspaceId, userId },
      },
    });

    if (existingMembership) {
      await this.invitationsRepository.updateStatus(
        invitation.id,
        InvitationStatus.accepted,
        new Date(),
      );
      throw new ConflictException('User is already a member of this workspace');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
      });

      await this.invitationsRepository.updateStatus(
        invitation.id,
        InvitationStatus.accepted,
        new Date(),
      );

      await this.createAuditLogTx(
        tx,
        invitation.workspaceId,
        userId,
        'invitation.accepted',
        'invitation',
        invitation.id,
        {
          email: invitation.email,
          role: invitation.role,
        },
      );
    });

    this.logger.log(`Invitation accepted: ${invitation.id} by user ${userId}`);

    return {
      message: 'Invitation accepted successfully',
      workspaceId: invitation.workspace.id,
      workspaceName: invitation.workspace.name,
    };
  }

  async revoke(
    userId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<{ message: string }> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (
      membership.role !== WorkspaceRole.owner &&
      membership.role !== WorkspaceRole.admin
    ) {
      throw new ForbiddenException(
        'Only owners and admins can revoke invitations',
      );
    }

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.workspaceId !== workspaceId) {
      throw new ForbiddenException(
        'Invitation does not belong to this workspace',
      );
    }

    if (invitation.status !== InvitationStatus.pending) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    await this.invitationsRepository.revoke(invitationId);

    await this.createAuditLog(
      workspaceId,
      userId,
      'invitation.revoked',
      'invitation',
      invitationId,
      {
        email: invitation.email,
      },
    );

    this.logger.log(`Invitation revoked: ${invitationId} by user ${userId}`);

    return { message: 'Invitation revoked successfully' };
  }

  private async createAuditLog(
    workspaceId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: AuditMetadata,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        actorId,
        action,
        resourceType,
        resourceId,
        metadata,
      },
    });
  }

  private async createAuditLogTx(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: AuditMetadata,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        workspaceId,
        actorId,
        action,
        resourceType,
        resourceId,
        metadata,
      },
    });
  }

  private mapToResponse(
    invitation: InvitationWithRelations,
  ): InvitationResponseDto {
    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }
}
