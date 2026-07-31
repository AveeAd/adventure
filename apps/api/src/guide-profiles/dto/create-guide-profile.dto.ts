import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { RateUnit } from '@prisma/client';

// Same fixed short list as TripReport.currency (FEATURE.md §5) - a display
// label with no downstream exchange-rate math, not a Prisma enum.
const SUPPORTED_CURRENCIES = ['NPR', 'USD', 'EUR', 'INR'] as const;

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
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

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
