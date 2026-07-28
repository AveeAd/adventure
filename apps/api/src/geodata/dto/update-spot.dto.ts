import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSpotDto } from './create-spot.dto';

export class UpdateSpotDto extends PartialType(CreateSpotDto) {
  // transient - not a stored column, same reasoning as UpdateTrailDto
  @IsOptional()
  @IsBoolean()
  isSafetyCriticalEdit?: boolean;
}
