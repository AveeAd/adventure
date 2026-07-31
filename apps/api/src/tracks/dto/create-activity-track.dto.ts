import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { ActivityTrackVisibility } from '@prisma/client';
import { TrackPointDto } from './track-point.dto';

export class CreateActivityTrackDto {
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

  @IsOptional()
  @IsString()
  clientUuid?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(100000)
  @ValidateNested({ each: true })
  @Type(() => TrackPointDto)
  points: TrackPointDto[];
}
