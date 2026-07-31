import { ActivityTrackVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

// Multipart form fields alongside the uploaded file.
export class ImportActivityTrackDto {
  @IsUUID()
  activityTypeId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ActivityTrackVisibility)
  visibility?: ActivityTrackVisibility;

  // idempotency key for offline upload retries - see ActivityTrack.clientUuid
  @IsOptional()
  @IsString()
  clientUuid?: string;
}
