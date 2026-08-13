import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authPost } from '../lib/auth/auth-fetch';
import { useApprovalEligibility } from '../lib/auth/eligibility';
import { Button } from './Button';
import { Card } from './Card';
import { Field, Textarea } from './FormField';

interface VoteResponse {
  outcome: 'PENDING' | 'APPROVED' | 'REJECTED';
  approveCount: number;
  rejectCount: number;
  threshold: number;
}

// MILESTONE_3.md §5.3/§9.1: Approve/Decline buttons on a PENDING revision's
// diff view. voteUrl is one of the three parallel vote endpoints
// (adventure-pages|trails|spots)/:id/revisions/:version/votes - identical
// request/response shape across all three (see approval-rules.util.ts).
export function VoteControls({
  voteUrl,
  editorId,
  approvalStatus,
  approveCount,
  rejectCount,
  threshold,
  onVoted,
}: {
  voteUrl: string;
  editorId: string;
  approvalStatus: string;
  approveCount: number;
  rejectCount: number;
  threshold: number;
  onVoted: (result: VoteResponse) => void;
}) {
  const { t } = useTranslation('adventurePage');
  const eligibility = useApprovalEligibility();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  if (approvalStatus !== 'PENDING') {
    return null;
  }

  async function castVote(decision: 'APPROVE' | 'REJECT') {
    setSubmitting(true);
    setError(null);
    try {
      const result = await authPost<VoteResponse>(voteUrl, {
        decision,
        rejectionReason: decision === 'REJECT' && reason ? reason : undefined,
      });
      setVoted(true);
      setDeclining(false);
      onVoted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('approval.voteError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mt-4 p-4">
      <p className="text-sm text-stone-600 dark:text-stone-300">
        {t('approval.voteProgress', { approve: approveCount, reject: rejectCount, threshold })}
      </p>

      {eligibility.loading ? null : !eligibility.currentUser ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t('approval.signInToVote')}</p>
      ) : eligibility.currentUser.userId === editorId &&
        eligibility.currentUser.role !== 'ADMIN' &&
        eligibility.currentUser.role !== 'MODERATOR' ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t('approval.cannotVoteOwn')}</p>
      ) : !eligibility.canVote ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t('approval.notEligible')}</p>
      ) : voted ? (
        <p className="mt-2 text-sm text-primary-700 dark:text-primary-400">{t('approval.voted')}</p>
      ) : (
        <div className="mt-3">
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => castVote('APPROVE')} disabled={submitting}>
              {t('approval.approve')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDeclining((v) => !v)} disabled={submitting}>
              {t('approval.decline')}
            </Button>
          </div>
          {declining && (
            <div className="mt-3 flex flex-col gap-2">
              <Field label={t('approval.declineReason')}>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <div>
                <Button variant="danger" size="sm" onClick={() => castVote('REJECT')} disabled={submitting}>
                  {submitting ? t('approval.submitting') : t('approval.confirmDecline')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Card>
  );
}
