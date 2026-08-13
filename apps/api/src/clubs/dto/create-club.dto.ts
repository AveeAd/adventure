import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;

export class CreateClubDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: (typeof VISIBILITIES)[number];
}
