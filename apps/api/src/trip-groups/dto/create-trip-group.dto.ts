import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTripGroupDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dateStart: string;

  @IsDateString()
  dateEnd: string;
}
