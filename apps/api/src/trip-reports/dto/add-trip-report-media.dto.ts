import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddTripReportMediaDto {
  @IsUrl()
  url: string;

  // See AddMediaDto's identical fields for why these are optional.
  @IsOptional()
  @IsUrl()
  smallUrl?: string;

  @IsOptional()
  @IsUrl()
  mediumUrl?: string;

  @IsOptional()
  @IsUrl()
  largeUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
