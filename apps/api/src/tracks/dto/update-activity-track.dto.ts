import { ActivityTrackVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

// Geometry and aggregates are server-derived and immutable - only these
// three fields are ever user-editable after import/creation.
export class UpdateActivityTrackDto {
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
}
