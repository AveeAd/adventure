import { ApprovalDecision } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CastVoteDto {
  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
