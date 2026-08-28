import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Invitation token' })
  @IsString()
  @Length(1, 255)
  token: string;
}
