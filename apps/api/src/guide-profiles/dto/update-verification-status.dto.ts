import { GuideVerificationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateVerificationStatusDto {
  @IsEnum(GuideVerificationStatus)
  status: GuideVerificationStatus;
}
