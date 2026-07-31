import { IsUUID } from 'class-validator';

export class ProposeTrailUpdateDto {
  @IsUUID()
  trailId: string;
}
