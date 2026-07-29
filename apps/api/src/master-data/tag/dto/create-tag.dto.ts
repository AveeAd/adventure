import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  slug: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
