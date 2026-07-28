import { ArrayMinSize, IsArray, IsIn, IsNumber } from 'class-validator';

export class PointGeometryDto {
  @IsIn(['Point'])
  type: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsNumber({}, { each: true })
  coordinates: number[];
}

export class LineStringGeometryDto {
  @IsIn(['LineString'])
  type: string;

  @IsArray()
  @ArrayMinSize(2)
  coordinates: number[][];
}
