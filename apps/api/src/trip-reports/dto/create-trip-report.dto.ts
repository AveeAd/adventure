import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTripReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dateCompleted: string;

  @IsOptional()
  @IsInt()
  durationDays?: number;

  // implicit currency (NPR), no currency column - per TRIP_REPORTS.md
  @IsOptional()
  @IsInt()
  actualCostAmount?: number;
}
