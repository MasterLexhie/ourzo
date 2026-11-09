import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class TaskAssigneeDto {
  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;
}

export class TaskResponseDto {
  @ApiProperty({ example: 'task-uuid' })
  id: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string;

  @ApiProperty({ example: 'project-uuid' })
  projectId: string;

  @ApiProperty({ example: 'Design new homepage' })
  title: string;

  @ApiPropertyOptional({ example: 'Create wireframes and mockups' })
  description?: string | null;

  @ApiProperty({ enum: TaskStatus, example: 'todo' })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: 'medium' })
  priority: TaskPriority;

  @ApiPropertyOptional({ type: TaskAssigneeDto, nullable: true })
  assignee?: TaskAssigneeDto | null;

  @ApiPropertyOptional({ example: '2024-02-15T00:00:00.000Z' })
  dueDate?: Date | null;

  @ApiProperty({ example: 'user-uuid' })
  createdBy: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}

export class TaskListResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  tasks: TaskResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
