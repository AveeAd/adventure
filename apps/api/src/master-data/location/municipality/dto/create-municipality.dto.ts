import { MunicipalityType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateMunicipalityDto {
  @IsString()
  districtId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(MunicipalityType)
  type: MunicipalityType;
}
