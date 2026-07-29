import { GeoVerificationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateGeoVerificationStatusDto {
  @IsEnum(GeoVerificationStatus)
  status: GeoVerificationStatus;
}
