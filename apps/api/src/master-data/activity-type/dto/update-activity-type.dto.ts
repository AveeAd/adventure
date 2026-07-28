import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateActivityTypeDto } from './create-activity-type.dto';

export class UpdateActivityTypeDto extends PartialType(CreateActivityTypeDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
