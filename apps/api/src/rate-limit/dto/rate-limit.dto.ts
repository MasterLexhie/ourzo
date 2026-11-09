import { ApiProperty } from '@nestjs/swagger';

export class RateLimitConfigDto {
  @ApiProperty({ example: 100 })
  maxRequests!: number;

  @ApiProperty({ example: 60 })
  windowMs!: number;

  @ApiProperty({ example: 'api' })
  keyPrefix!: string;
}

export class RateLimitInfoDto {
  @ApiProperty({ example: 95 })
  remaining!: number;

  @ApiProperty({ example: 60 })
  resetInSeconds!: number;

  @ApiProperty({ example: false })
  limited!: boolean;
}
