import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Inc Updated',
    minLength: 1,
    maxLength: 150,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @ApiProperty({
    description: 'Organization slug',
    example: 'acme-inc-updated',
    minLength: 2,
    maxLength: 150,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  slug?: string;
}