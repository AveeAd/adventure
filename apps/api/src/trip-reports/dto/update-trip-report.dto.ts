import { PartialType } from '@nestjs/mapped-types';
import { CreateTripReportDto } from './create-trip-report.dto';

export class UpdateTripReportDto extends PartialType(CreateTripReportDto) {}
