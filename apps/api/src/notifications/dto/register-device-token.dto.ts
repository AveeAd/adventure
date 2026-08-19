import { DevicePlatform } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(1)
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}
