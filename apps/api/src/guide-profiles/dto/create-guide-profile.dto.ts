import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { RateUnit } from '@prisma/client';

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

  // informational only, never referenced by transaction logic per GUIDES.md
  @IsOptional()
  @IsEnum(RateUnit)
  rateUnit?: RateUnit;

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
