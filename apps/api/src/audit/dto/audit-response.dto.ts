import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class AuditLogResponseDto {
  @ApiProperty({ example: 'audit-uuid' })
  id!: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId!: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  actorId?: string | null;

  @ApiProperty({ example: 'project.created' })
  action!: string;

  @ApiProperty({ example: 'project' })
  resourceType!: string;

  @ApiPropertyOptional({ example: 'project-uuid' })
  resourceId?: string | null;

  @ApiPropertyOptional({
    example: { name: 'Website Redesign', status: 'planned' },
  })
  metadata?: Prisma.JsonValue | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({
    example: {
      id: 'user-uuid',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  actor?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  auditLogs!: AuditLogResponseDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
