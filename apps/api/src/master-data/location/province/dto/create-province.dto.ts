import { IsString, MinLength } from 'class-validator';

export class CreateProvinceDto {
  @IsString()
  countryId: string;

  @IsString()
  @MinLength(1)
  name: string;
}
