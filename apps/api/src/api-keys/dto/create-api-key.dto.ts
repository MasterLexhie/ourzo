import {
  IsArray,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApiKeyScopeDto {
  @ApiProperty({ example: 'projects:read' })
  @IsString()
  @IsNotEmpty()
  scope: string;
}

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API key name',
    example: 'Production API Key',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Array of scopes',
    example: ['projects:read', 'projects:write', 'tasks:read'],
    type: [ApiKeyScopeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiKeyScopeDto)
  scopes: ApiKeyScopeDto[];

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
