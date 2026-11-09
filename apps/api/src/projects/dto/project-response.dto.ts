import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export class ProjectMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;
}

export class ProjectResponseDto {
  @ApiProperty({ example: 'project-uuid' })
  id!: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId!: string;

  @ApiProperty({ example: 'Website Redesign' })
  name!: string;

  @ApiPropertyOptional({ example: 'Redesign the company website' })
  description?: string | null;

  @ApiProperty({ enum: ProjectStatus, example: 'planned' })
  status!: ProjectStatus;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  startDate?: Date | null;

  @ApiPropertyOptional({ example: '2024-06-30T00:00:00.000Z' })
  targetDate?: Date | null;

  @ApiProperty({ example: 'user-uuid' })
  createdBy!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: [ProjectMemberDto], required: false })
  members?: ProjectMemberDto[];

  @ApiPropertyOptional({ example: 5, required: false })
  taskCount?: number;

  @ApiPropertyOptional({ example: 60, required: false })
  progress?: number;
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  projects!: ProjectResponseDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class ProjectProgressResponseDto {
  @ApiProperty({ example: 60 })
  progress!: number;

  @ApiProperty({ example: 6 })
  totalTasks!: number;

  @ApiProperty({ example: 3 })
  completedTasks!: number;
}
