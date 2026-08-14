import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const THREAD_TAGS = ['DISCUSSION', 'TRIP_SHARE', 'QUESTION', 'ANNOUNCEMENT', 'RANDOM'] as const;

export class CreateThreadDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsIn(THREAD_TAGS)
  tag?: (typeof THREAD_TAGS)[number];

  @IsOptional()
  @IsUUID('4')
  tripReportId?: string;

  @IsOptional()
  @IsUUID('4')
  trailId?: string;

  @IsOptional()
  @IsUUID('4')
  spotId?: string;

  @IsOptional()
  @IsUUID('4')
  adventurePageId?: string;
}
