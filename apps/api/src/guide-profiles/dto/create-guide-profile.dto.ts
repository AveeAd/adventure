import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateGuideProfileDto {
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  rateMin?: number;

  @IsOptional()
  @IsInt()
  rateMax?: number;

  // free text (e.g. "per day", "per trip") - informational only, never
  // referenced by transaction logic per GUIDES.md
  @IsOptional()
  @IsString()
  rateUnit?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  specialtyActivityTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  regionDistrictIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  languageIds?: string[];
}
