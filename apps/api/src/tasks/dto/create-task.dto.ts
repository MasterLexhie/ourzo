import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Design new homepage',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Create wireframes and mockups for the new homepage design',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    description: 'Project ID this task belongs to',
    example: 'project-uuid',
  })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
    example: 'todo',
    default: 'todo',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
    example: 'medium',
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Assignee user ID (must be a project member)',
    example: 'user-uuid',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Task due date (YYYY-MM-DD)',
    example: '2024-02-15',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
