import { ApprovalDecision, Role } from '@prisma/client';

// MILESTONE_3.md §5.3: pure eligibility/resolution rules, shared verbatim by
// AdventurePagesService/TrailsService/SpotsService rather than a polymorphic
// voting engine - each service still owns its own Prisma-specific vote
// method (upsert the confirmation row, apply the snapshot on approval), the
// same "duplicate the service, share the pure logic" split guide-level.util.ts
// already establishes for the point curve.

export function isApprovalEligible(role: Role, guideLevel: number, minGuideLevel: number): boolean {
  return role === Role.ADMIN || role === Role.MODERATOR || guideLevel >= minGuideLevel;
}

export type VoteOutcome = 'PENDING' | 'APPROVED' | 'REJECTED';

// §5.3: "A revision is approved/rejected at threshold votes, or immediately
// on a single ADMIN/MODERATOR vote" - an admin/moderator's vote always
// finalizes in the direction they cast it, no threshold involved.
export function resolveVoteOutcome(
  decision: ApprovalDecision,
  isAdminOrModVote: boolean,
  approveCount: number,
  rejectCount: number,
  threshold: number,
): VoteOutcome {
  if (isAdminOrModVote) {
    return decision === ApprovalDecision.APPROVE ? 'APPROVED' : 'REJECTED';
  }
  if (approveCount >= threshold) {
    return 'APPROVED';
  }
  if (rejectCount >= threshold) {
    return 'REJECTED';
  }
  return 'PENDING';
}

// MILESTONE_3.md §5.4: verificationStatus derived from approval state.
// `hasUpheldReport` is Phase 23's wiring of the third NEEDS_REVIEW trigger -
// an upheld ContentReport forces NEEDS_REVIEW regardless of what the
// approved/latest comparison below would otherwise say, since the content
// was just reverted specifically because it failed review.
export function deriveVerificationStatus(
  approvedRevisionId: string | null,
  latestRevisionId: string,
  pendingRevisions: { isSafetyCriticalEdit: boolean }[],
  hasUpheldReport = false,
): 'UNVERIFIED' | 'VERIFIED' | 'NEEDS_REVIEW' {
  if (hasUpheldReport) {
    return 'NEEDS_REVIEW';
  }
  if (!approvedRevisionId) {
    return 'UNVERIFIED';
  }
  if (approvedRevisionId === latestRevisionId) {
    return 'VERIFIED';
  }
  const hasSafetyCriticalPending = pendingRevisions.some((r) => r.isSafetyCriticalEdit);
  return hasSafetyCriticalPending ? 'NEEDS_REVIEW' : 'VERIFIED';
}
