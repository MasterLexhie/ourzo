import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;
}

/**
 * Server-side result of issuing a session. Only `body` is returned to the
 * client; the refresh token is delivered as an httpOnly cookie.
 */
export interface IssuedSession<TBody> {
  body: TBody;
  refreshToken: string;
  refreshTokenMaxAgeSeconds: number;
}

export class AuthResponseDto {
  @ApiProperty()
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerifiedAt: Date | null;
  };

  @ApiProperty()
  tokens!: TokenResponseDto;
}
