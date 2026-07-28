import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSpotTypeDto } from './create-spot-type.dto';

export class UpdateSpotTypeDto extends PartialType(CreateSpotTypeDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
