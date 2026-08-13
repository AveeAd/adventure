import { IsIn } from 'class-validator';

const DECISIONS = ['APPROVED', 'DECLINED'] as const;

export class DecideClubJoinRequestDto {
  @IsIn(DECISIONS)
  decision: (typeof DECISIONS)[number];
}
