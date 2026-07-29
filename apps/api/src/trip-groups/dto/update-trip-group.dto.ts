import { PartialType } from '@nestjs/mapped-types';
import { CreateTripGroupDto } from './create-trip-group.dto';

export class UpdateTripGroupDto extends PartialType(CreateTripGroupDto) {}
