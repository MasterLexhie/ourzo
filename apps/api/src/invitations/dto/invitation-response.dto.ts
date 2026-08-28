import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus, WorkspaceRole } from '@prisma/client';

export class InvitationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: WorkspaceRole })
  role: WorkspaceRole;

  @ApiProperty({ enum: InvitationStatus })
  status: InvitationStatus;

  @ApiProperty()
  invitedBy: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  acceptedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InvitationListResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] })
  invitations: InvitationResponseDto[];
}

export class AcceptInvitationResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  workspaceName: string;
}
