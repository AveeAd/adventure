import { IsISO8601, IsNumber, IsOptional } from 'class-validator';

// A device-recorded point, for a future client that captured GPS fixes
// itself rather than exporting a file - see ACTIVITY_TRACKS.md's
// `POST /activity-tracks` (JSON body).
export class TrackPointDto {
  @IsNumber()
  lng: number;

  @IsNumber()
  lat: number;

  @IsOptional()
  @IsNumber()
  ele?: number;

  @IsISO8601()
  t: string;
}
