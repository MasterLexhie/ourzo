import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty()
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerifiedAt: Date | null;
  };

  @ApiProperty()
  tokens: TokenResponseDto;
}
