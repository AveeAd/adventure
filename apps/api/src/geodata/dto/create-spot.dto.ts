import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { PointGeometryDto } from './geometry.dto';

export class CreateSpotDto {
  @IsUUID()
  spotTypeId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => PointGeometryDto)
  geometry: PointGeometryDto;

  @IsOptional()
  @IsInt()
  elevationMeters?: number;
}
