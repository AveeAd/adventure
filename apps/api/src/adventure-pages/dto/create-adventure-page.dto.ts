import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateAdventurePageDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  slug: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsUUID()
  activityTypeId: string;

  @IsOptional()
  @IsUUID()
  difficultyLevelId?: string;

  @IsOptional()
  @IsInt()
  durationMinDays?: number;

  @IsOptional()
  @IsInt()
  durationMaxDays?: number;

  @IsOptional()
  @IsInt()
  maxAltitudeMeters?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  districtIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  seasonIds?: string[];

  @IsString()
  @MinLength(1)
  content: string;
}
