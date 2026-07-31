import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateSpotDto } from './create-spot.dto';

export class UpdateSpotDto extends PartialType(CreateSpotDto) {
  // Stored on the SpotRevision this edit creates - see UpdateTrailDto.
  @IsOptional()
  @IsBoolean()
  isSafetyCriticalEdit?: boolean;

  @IsOptional()
  @IsString()
  editSummary?: string;
}
