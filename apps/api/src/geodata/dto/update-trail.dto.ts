import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTrailDto } from './create-trail.dto';

export class UpdateTrailDto extends PartialType(CreateTrailDto) {
  // transient - not a stored column, since there's no revision to attach it
  // to; just a signal for which verificationStatus this edit resets to
  @IsOptional()
  @IsBoolean()
  isSafetyCriticalEdit?: boolean;
}
