import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'New role for the member', enum: WorkspaceRole })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

export class TransferOwnershipDto {
  @ApiProperty({ description: 'User ID to transfer ownership to' })
  @IsString()
  userId: string;
}
