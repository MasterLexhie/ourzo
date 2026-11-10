import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AddProjectMembersDto {
  @ApiProperty({
    description: 'IDs of workspace members to add to the project',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  userIds!: string[];
}
