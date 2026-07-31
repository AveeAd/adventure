import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class PromoteToTrailDto {
  @IsUUID()
  adventurePageId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
