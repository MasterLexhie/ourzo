import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'notification-uuid' })
  id: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ example: 'task.assigned' })
  type: string;

  @ApiProperty({ example: 'Task Assigned' })
  title: string;

  @ApiProperty({
    example: 'You have been assigned to task "Design new homepage"',
  })
  message: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  readAt?: Date | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  notifications: NotificationResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  unreadCount: number;
}
