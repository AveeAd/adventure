import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitRevisionDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  editSummary?: string;

  @IsOptional()
  @IsBoolean()
  isSafetyCriticalEdit?: boolean;
}
