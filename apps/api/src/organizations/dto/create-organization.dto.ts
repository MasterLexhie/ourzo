import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Inc',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Organization slug (URL-friendly identifier)',
    example: 'acme-inc',
    minLength: 2,
    maxLength: 150,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug: string;
}
