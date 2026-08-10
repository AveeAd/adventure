import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateSpotDto } from '../../geodata/dto/create-spot.dto';
import { CreateTrailDto } from '../../geodata/dto/create-trail.dto';

export class CreateAdventurePageDto {
  @IsString()
  @MinLength(1)
  title: string;

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

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @IsString()
  @MinLength(1)
  content: string;

  // Optional initial trail/spots for this page - created atomically with the
  // page + its v1 revision in one transaction (see AdventurePagesService.
  // create()), so the "create adventure" form can be a single submission
  // instead of separate follow-up trips through /trails/new and /spots/new.
  // GPX-file trail import stays a separate follow-up request (multipart
  // upload doesn't fit this JSON body) - draw-on-map trails only here.
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTrailDto)
  trail?: CreateTrailDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSpotDto)
  spots?: CreateSpotDto[];
}
