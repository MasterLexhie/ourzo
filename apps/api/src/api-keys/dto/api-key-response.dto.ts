import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyScopeResponseDto {
  @ApiProperty({ example: 'projects:read' })
  scope!: string;
}

export class ApiKeyResponseDto {
  @ApiProperty({ example: 'apikey-uuid' })
  id!: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId!: string;

  @ApiProperty({ example: 'Production API Key' })
  name!: string;

  @ApiProperty({ example: 'ourzo_prod' })
  keyPrefix!: string;

  @ApiPropertyOptional({ example: 'ourzo_prod_abcdef123456...' })
  key?: string;

  @ApiProperty({ type: [ApiKeyScopeResponseDto] })
  scopes!: ApiKeyScopeResponseDto[];

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  lastUsedAt?: Date | null;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  revokedAt?: Date | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}

export class ApiKeyListResponseDto {
  @ApiProperty({ type: [ApiKeyResponseDto] })
  apiKeys!: ApiKeyResponseDto[];
}

export class CreateApiKeyResponseDto {
  @ApiProperty({ example: 'apikey-uuid' })
  id!: string;

  @ApiProperty({
    example: 'ourzo_prod_abcdef1234567890abcdef1234567890abcdef12',
  })
  key!: string;

  @ApiProperty({ example: 'Production API Key' })
  name!: string;

  @ApiProperty({ type: [ApiKeyScopeResponseDto] })
  scopes!: ApiKeyScopeResponseDto[];

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  expiresAt?: Date | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}
