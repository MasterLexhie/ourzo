import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UsageResource, WorkspacePlan } from '@prisma/client';

export class UsageItemDto {
  @ApiProperty({ enum: UsageResource, example: 'members' })
  resource!: UsageResource;

  @ApiProperty({ example: 3 })
  current!: number;

  @ApiProperty({ example: 5 })
  limit!: number;

  @ApiProperty({ example: 60 })
  percentage!: number;

  @ApiProperty({ example: false })
  warning!: boolean;

  @ApiProperty({ example: false })
  exceeded!: boolean;
}

export class UsageResponseDto {
  @ApiProperty({ enum: WorkspacePlan, example: 'free' })
  plan!: WorkspacePlan;

  @ApiProperty({ type: [UsageItemDto] })
  usage!: UsageItemDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  periodStart!: Date;

  @ApiProperty({ example: '2024-01-31T23:59:59Z' })
  periodEnd!: Date;
}

export class CheckLimitResponseDto {
  @ApiProperty({ example: true })
  allowed!: boolean;

  @ApiPropertyOptional({
    example: 'Project limit reached (3/3). Upgrade to Pro for more projects.',
  })
  message?: string;

  @ApiPropertyOptional({ example: 100 })
  percentage?: number;
}
