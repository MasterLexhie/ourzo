import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';

export class MemberResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: WorkspaceRole })
  role: WorkspaceRole;

  @ApiProperty()
  joinedAt: Date;
}

export class MemberListResponseDto {
  @ApiProperty({ type: [MemberResponseDto] })
  members: MemberResponseDto[];
}
