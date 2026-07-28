import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSeasonDto } from './create-season.dto';

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
