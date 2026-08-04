import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideModeratorApplicationDto {
  // mirrors ResolveReportDto's deliberate choice of a plain 'APPROVED' |
  // 'REJECTED' literal over reusing an unrelated enum (ApprovalDecision
  // means something else - a vote on a revision).
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}
