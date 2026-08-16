import { IsString, MinLength } from 'class-validator';

export class GoogleMobileLoginDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
