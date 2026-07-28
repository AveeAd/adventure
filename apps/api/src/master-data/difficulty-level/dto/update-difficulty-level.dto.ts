import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDifficultyLevelDto } from './create-difficulty-level.dto';

export class UpdateDifficultyLevelDto extends PartialType(CreateDifficultyLevelDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
