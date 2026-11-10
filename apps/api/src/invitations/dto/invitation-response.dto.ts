import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus, WorkspaceRole } from '@prisma/client';

export class InvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: WorkspaceRole })
  role!: WorkspaceRole;

  @ApiProperty({ enum: InvitationStatus })
  status!: InvitationStatus;

  @ApiProperty()
  invitedBy!: string;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  acceptedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/**
 * Returned only to the Owner/Admin who creates the invitation. The link embeds
 * the single-use token, so it is never included in list responses.
 */
export class CreateInvitationResponseDto extends InvitationResponseDto {
  @ApiProperty({
    example: 'http://localhost:5173/accept-invitation?token=…',
    description: 'Shareable link the invitee opens to accept the invitation',
  })
  inviteUrl!: string;
}

export class InvitationListResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] })
  invitations!: InvitationResponseDto[];
}

export class AcceptInvitationResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  workspaceName!: string;
}
