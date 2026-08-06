import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSeasonDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
