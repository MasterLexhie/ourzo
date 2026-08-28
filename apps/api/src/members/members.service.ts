import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MembersRepository } from './repositories/members.repository';
import {
  UpdateMemberRoleDto,
  TransferOwnershipDto,
} from './dto/update-member.dto';
import {
  MemberResponseDto,
  MemberListResponseDto,
} from './dto/member-response.dto';
import { WorkspaceRole, Prisma } from '@prisma/client';

interface MemberWithUser {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

type AuditMetadata = Prisma.InputJsonValue;

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membersRepository: MembersRepository,
  ) {}

  async findAllForWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<MemberListResponseDto> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const members = await this.membersRepository.findByWorkspace(workspaceId);

    return {
      members: members.map((m) => this.mapToResponse(m)),
    };
  }

  async updateRole(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    const requesterMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (
      requesterMembership.role !== WorkspaceRole.owner &&
      requesterMembership.role !== WorkspaceRole.admin
    ) {
      throw new ForbiddenException(
        'Only owners and admins can update member roles',
      );
    }

    const targetMembership = await this.membersRepository.findById(
      workspaceId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (targetUserId === userId) {
      throw new BadRequestException('Cannot change your own role');
    }

    if (targetMembership.role === WorkspaceRole.owner) {
      throw new ForbiddenException('Cannot change the role of an owner');
    }

    if (
      requesterMembership.role === WorkspaceRole.admin &&
      dto.role === WorkspaceRole.owner
    ) {
      throw new ForbiddenException('Admins cannot assign owner role');
    }

    if (
      requesterMembership.role === WorkspaceRole.admin &&
      targetMembership.role === WorkspaceRole.admin
    ) {
      throw new ForbiddenException('Admins cannot modify other admins');
    }

    const updatedMember = await this.membersRepository.updateRole(
      workspaceId,
      targetUserId,
      dto.role,
    );

    await this.createAuditLog(
      workspaceId,
      userId,
      'member.role_changed',
      'member',
      targetUserId,
      {
        previousRole: targetMembership.role,
        newRole: dto.role,
      },
    );

    this.logger.log(
      `Member role updated: ${targetUserId} to ${dto.role} in workspace ${workspaceId} by ${userId}`,
    );

    return this.mapToResponse({
      ...updatedMember,
      user: (await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }))!,
    });
  }

  async removeMember(
    userId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    const requesterMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (
      requesterMembership.role !== WorkspaceRole.owner &&
      requesterMembership.role !== WorkspaceRole.admin
    ) {
      throw new ForbiddenException('Only owners and admins can remove members');
    }

    if (targetUserId === userId) {
      throw new BadRequestException(
        'Cannot remove yourself. Transfer ownership first if you are the only owner.',
      );
    }

    const targetMembership = await this.membersRepository.findById(
      workspaceId,
      targetUserId,
    );

    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (targetMembership.role === WorkspaceRole.owner) {
      const ownerCount = await this.membersRepository.countOwners(workspaceId);
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove the last owner. Transfer ownership first.',
        );
      }
    }

    if (
      requesterMembership.role === WorkspaceRole.admin &&
      targetMembership.role === WorkspaceRole.owner
    ) {
      throw new ForbiddenException('Admins cannot remove owners');
    }

    if (
      requesterMembership.role === WorkspaceRole.admin &&
      targetMembership.role === WorkspaceRole.admin
    ) {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    await this.membersRepository.remove(workspaceId, targetUserId);

    await this.createAuditLog(
      workspaceId,
      userId,
      'member.removed',
      'member',
      targetUserId,
      {
        removedRole: targetMembership.role,
      },
    );

    this.logger.log(
      `Member removed: ${targetUserId} from workspace ${workspaceId} by ${userId}`,
    );

    return { message: 'Member removed successfully' };
  }

  async transferOwnership(
    userId: string,
    workspaceId: string,
    dto: TransferOwnershipDto,
  ): Promise<MemberResponseDto> {
    const requesterMembership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (requesterMembership.role !== WorkspaceRole.owner) {
      throw new ForbiddenException('Only owners can transfer ownership');
    }

    if (dto.userId === userId) {
      throw new BadRequestException('You are already the owner');
    }

    const targetMembership = await this.membersRepository.findById(
      workspaceId,
      dto.userId,
    );

    if (!targetMembership) {
      throw new NotFoundException(
        'Target user is not a member of this workspace',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: dto.userId } },
        data: { role: WorkspaceRole.owner },
      });

      await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: { role: WorkspaceRole.admin },
      });

      await this.createAuditLogTx(
        tx,
        workspaceId,
        userId,
        'ownership.transferred',
        'member',
        dto.userId,
        {
          previousOwner: userId,
          newOwner: dto.userId,
        },
      );
    });

    this.logger.log(
      `Ownership transferred: ${userId} -> ${dto.userId} in workspace ${workspaceId}`,
    );

    const updatedMember = await this.membersRepository.findById(
      workspaceId,
      dto.userId,
    );

    return this.mapToResponse({
      ...updatedMember!,
      user: (await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }))!,
    });
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

  private mapToResponse(member: MemberWithUser): MemberResponseDto {
    return {
      userId: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      role: member.role,
      joinedAt: member.createdAt,
    };
  }
}
