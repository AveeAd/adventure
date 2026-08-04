import { IsString, MaxLength } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  @MaxLength(200)
  value: string;
}
