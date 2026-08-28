import { ApiProperty } from '@nestjs/swagger';
import { WorkspacePlan, WorkspaceRole } from '@prisma/client';

export class OrganizationMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ enum: WorkspaceRole, example: 'owner' })
  role: WorkspaceRole;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  joinedAt: Date;
}

export class OrganizationResponseDto {
  @ApiProperty({ example: 'org-uuid' })
  id: string;

  @ApiProperty({ example: 'Acme Inc' })
  name: string;

  @ApiProperty({ example: 'acme-inc' })
  slug: string;

  @ApiProperty({ enum: WorkspacePlan, example: 'free' })
  plan: WorkspacePlan;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;

  @ApiProperty({ type: [OrganizationMemberDto], required: false })
  members?: OrganizationMemberDto[];

  @ApiProperty({ example: 5, required: false })
  memberCount?: number;

  @ApiProperty({ example: 3, required: false })
  projectCount?: number;
}

export class OrganizationListResponseDto {
  @ApiProperty({ type: [OrganizationResponseDto] })
  organizations: OrganizationResponseDto[];
}