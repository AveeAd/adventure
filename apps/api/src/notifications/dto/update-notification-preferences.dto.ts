import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  socialEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  contributionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  moderationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  clubsEnabled?: boolean;
}
