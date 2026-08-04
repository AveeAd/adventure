import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReportDto {
  // MILESTONE_3.md §8: a report resolves to UPHELD (the content was bad,
  // enforcement applies) or REJECTED (no action, no penalty) - deliberately
  // not the ApprovalDecision enum, which means something different (a vote
  // on a revision, not a verdict on a complaint).
  @IsIn(['UPHELD', 'REJECTED'])
  decision: 'UPHELD' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
