import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Email of the user to invite' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiPropertyOptional({
    description: 'Role for the invited user',
    enum: WorkspaceRole,
    default: WorkspaceRole.member,
  })
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}
