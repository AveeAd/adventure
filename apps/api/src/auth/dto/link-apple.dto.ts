import { IsString, MinLength } from 'class-validator';

export class LinkAppleDto {
  @IsString()
  @MinLength(1)
  identityToken!: string;
}
