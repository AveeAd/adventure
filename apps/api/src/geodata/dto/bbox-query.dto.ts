import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Was raw @Query() strings coerced with Number(...) - no DTO, so NaN flowed
// straight into the SQL. Applied with a parameter-scoped
// `new ValidationPipe({ transform: true })` rather than flipping the
// app-wide pipe's `transform` option, to keep this fix's blast radius to
// just the bbox endpoints. See ACTIVITY_TRACKS.md's prerequisite fixes.
export class BboxQueryDto {
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  minLng: number;

  @Type(() => Number)
  @Min(-90)
  @Max(90)
  minLat: number;

  @Type(() => Number)
  @Min(-180)
  @Max(180)
  maxLng: number;

  @Type(() => Number)
  @Min(-90)
  @Max(90)
  maxLat: number;

  // Leaflet zoom level - drives the ST_Simplify tolerance. Lower zoom (more
  // area on screen) simplifies more aggressively.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  zoom?: number;
}
