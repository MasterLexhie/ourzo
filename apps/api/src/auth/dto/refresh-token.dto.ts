import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Deprecated: the refresh token is read from the httpOnly ourzo_refresh cookie. ' +
      'The body field is accepted for one release for older clients.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
