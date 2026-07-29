import { PageVerificationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateVerificationStatusDto {
  @IsEnum(PageVerificationStatus)
  status: PageVerificationStatus;
}
