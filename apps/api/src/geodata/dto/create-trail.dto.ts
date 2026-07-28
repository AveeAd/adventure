import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LineStringGeometryDto } from './geometry.dto';

export class CreateTrailDto {
  @IsOptional()
  @IsString()
  name?: string;

  @ValidateNested()
  @Type(() => LineStringGeometryDto)
  geometry: LineStringGeometryDto;

  @IsOptional()
  @IsInt()
  distanceMeters?: number;
}
