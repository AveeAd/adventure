import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

const SUPPORTED_CURRENCIES = ['NPR', 'USD', 'EUR', 'INR'] as const;

export class CreateTripReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsDateString()
  dateCompleted: string;

  @IsOptional()
  @IsInt()
  durationDays?: number;

  @IsOptional()
  @IsInt()
  actualCostAmount?: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  // The author's own ActivityTracks to attach to this story (sets
  // ActivityTrack.tripReportId) - ownership is checked in the service.
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  activityTrackIds?: string[];

  // A club the author belongs to, tagging this story as club activity -
  // membership is checked in the service, not the DTO.
  @IsOptional()
  @IsUUID('4')
  clubId?: string;
}
