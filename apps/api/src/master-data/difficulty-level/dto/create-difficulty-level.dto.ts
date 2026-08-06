import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDifficultyLevelDto {
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
