import { useEffect, useState } from 'react';
import { authFetch } from './auth-fetch';
import { fetchCurrentUser, type CurrentUser } from './session';

const APPROVAL_MIN_GUIDE_LEVEL = 10;

interface GuideProfileSummary {
  guideLevel: number;
}

// MILESTONE_3.md §5.3: mirrors the API's isApprovalEligible() - role
// ADMIN/MODERATOR always qualifies, everyone else needs guideLevel >= 10.
// This is a UI affordance only (hide buttons a vote would 403 on); the API
// re-checks eligibility itself on every vote/queue request.
export interface ApprovalEligibility {
  loading: boolean;
  currentUser: CurrentUser | null;
  guideLevel: number;
  canVote: boolean;
}

export function useApprovalEligibility(): ApprovalEligibility {
  const [state, setState] = useState<ApprovalEligibility>({
    loading: true,
    currentUser: null,
    guideLevel: 1,
    canVote: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        if (!cancelled) setState({ loading: false, currentUser: null, guideLevel: 1, canVote: false });
        return;
      }
      if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
        if (!cancelled) setState({ loading: false, currentUser, guideLevel: 1, canVote: true });
        return;
      }
      const res = await authFetch('/guide-profiles/me').catch(() => null);
      const profile: GuideProfileSummary | null = res?.ok ? await res.json() : null;
      const guideLevel = profile?.guideLevel ?? 1;
      if (!cancelled) {
        setState({ loading: false, currentUser, guideLevel, canVote: guideLevel >= APPROVAL_MIN_GUIDE_LEVEL });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
