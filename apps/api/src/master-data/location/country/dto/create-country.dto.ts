import { IsString, Length, MinLength } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @Length(2, 2)
  isoCode: string;
}
