import { IsString, MinLength } from 'class-validator';

export class CreateDistrictDto {
  @IsString()
  provinceId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  slug: string;
}
