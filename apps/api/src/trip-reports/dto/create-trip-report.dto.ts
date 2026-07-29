import { IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const SUPPORTED_CURRENCIES = ['NPR', 'USD', 'EUR', 'INR'] as const;

export class CreateTripReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsDateString()
  dateCompleted: string;

  @IsOptional()
  @IsInt()
  durationDays?: number;

  @IsOptional()
  @IsInt()
  actualCostAmount?: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}
