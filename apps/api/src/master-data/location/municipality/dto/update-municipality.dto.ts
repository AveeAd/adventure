import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMunicipalityDto } from './create-municipality.dto';

export class UpdateMunicipalityDto extends PartialType(CreateMunicipalityDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
