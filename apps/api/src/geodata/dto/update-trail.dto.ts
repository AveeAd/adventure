import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateTrailDto } from './create-trail.dto';

export class UpdateTrailDto extends PartialType(CreateTrailDto) {
  // Stored on the TrailRevision this edit creates (see GEODATA_HISTORY.md) -
  // also the signal for which verificationStatus this edit resets to.
  @IsOptional()
  @IsBoolean()
  isSafetyCriticalEdit?: boolean;

  @IsOptional()
  @IsString()
  editSummary?: string;
}
