import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDistrictDto {
  @IsString()
  provinceId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  slug: string;

  // Nepal's legal requirement that Annapurna/Manaslu/Upper Mustang trekking
  // routes go through a licensed agency, per IDEA.md - drives GuideProfile's
  // verification gating (GUIDES.md)
  @IsOptional()
  @IsBoolean()
  requiresRegisteredAgency?: boolean;
}
