import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDistrictDto } from './create-district.dto';

export class UpdateDistrictDto extends PartialType(CreateDistrictDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
