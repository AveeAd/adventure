import { useCustom, useCustomMutation, useInvalidate } from '@refinedev/core';
import { Button, Collapse, Input, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../lib/format';
import { UserRef } from '../../components/UserRef';

interface RevisionSummary {
  id: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  approvalStatus: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  rejectionReason: string | null;
  approveCount: number;
  rejectCount: number;
  threshold: number;
  createdAt: string;
}

interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

const APPROVAL_TAG_COLOR: Record<string, string> = { PENDING: 'gold', APPROVED: 'green', REJECTED: 'red' };

// MILESTONE_3.md §9.1 (admin): the approvers-column + vote panel AdventurePageShow
// was missing entirely - text-diff sibling of GeodataHistory.
export function PageHistory({ pageId }: { pageId: string }) {
  const { result, query } = useCustom<RevisionSummary[]>({ url: `/adventure-pages/${pageId}/revisions`, method: 'get' });
  const invalidate = useInvalidate();
  const { mutate: revertMutate, mutation: revertMutation } = useCustomMutation();
  const { t } = useTranslation('resources');

  const revisions = (Array.isArray(result?.data) ? [...result.data] : []).sort((a, b) => b.version - a.version);

  const revert = (version: number) => {
    revertMutate(
      { url: `/adventure-pages/${pageId}/revisions/${version}/revert`, method: 'post', values: {} },
      {
        onSuccess: () => {
          message.success(t('geodataHistory.reverted', { version }));
          invalidate({ resource: 'adventure-pages', invalidates: ['detail', 'list'], id: pageId });
          query.refetch();
        },
      },
    );
  };

  return (
    <Collapse
      items={revisions.map((revision) => ({
        key: revision.version,
        label: (
          <Space>
            <strong>v{revision.version}</strong>
            <span>{formatDateTime(revision.createdAt)}</span>
            <Tag color={APPROVAL_TAG_COLOR[revision.approvalStatus]}>{t(`approval.status.${revision.approvalStatus}`)}</Tag>
            {revision.isSafetyCriticalEdit && <Tag color="orange">{t('geodataHistory.safetyCritical')}</Tag>}
            {revision.editSummary && <span style={{ color: '#888' }}>{revision.editSummary}</span>}
          </Space>
        ),
        children: (
          <>
            {revision.resolvedById && (
              <Typography.Paragraph type="secondary">
                {revision.approvalStatus === 'REJECTED' ? t('approval.declinedByLabel') : t('approval.approvedByLabel')}{' '}
                <UserRef userId={revision.resolvedById} />
              </Typography.Paragraph>
            )}
            {revision.rejectionReason && (
              <Typography.Paragraph type="secondary">
                {t('approval.rejectionReason', { reason: revision.rejectionReason })}
              </Typography.Paragraph>
            )}
            <RevisionContentPanel pageId={pageId} version={revision.version} canRevert={revision.version !== revisions[0]?.version} onRevert={() => revert(revision.version)} reverting={revertMutation.isPending} />
            {revision.approvalStatus === 'PENDING' && (
              <VotePanel
                pageId={pageId}
                version={revision.version}
                onVoted={() => {
                  invalidate({ resource: 'adventure-pages', invalidates: ['detail', 'list'], id: pageId });
                  query.refetch();
                }}
              />
            )}
          </>
        ),
      }))}
    />
  );
}

function RevisionContentPanel({
  pageId,
  version,
  canRevert,
  onRevert,
  reverting,
}: {
  pageId: string;
  version: number;
  canRevert: boolean;
  onRevert: () => void;
  reverting: boolean;
}) {
  const { result, query } = useCustom<{ changes: DiffChange[] }>({
    url: `/adventure-pages/${pageId}/diff`,
    method: 'get',
    config: { query: { from: Math.max(1, version - 1), to: version } },
    queryOptions: { enabled: version > 1 },
  });
  const { t } = useTranslation('resources');

  if (version === 1) {
    return <p style={{ color: '#888' }}>{t('geodataHistory.firstRevision')}</p>;
  }

  if (query.isLoading || !result?.data) {
    return <p>{t('geodataHistory.loadingDiff')}</p>;
  }

  return (
    <>
      <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', fontSize: 12 }}>
        {result.data.changes.map((change, index) => (
          <span
            key={index}
            style={{
              backgroundColor: change.added ? '#d9f7be' : change.removed ? '#ffccc7' : undefined,
              textDecoration: change.removed ? 'line-through' : undefined,
            }}
          >
            {change.value}
          </span>
        ))}
      </pre>
      {canRevert && (
        <Button style={{ marginTop: 12 }} danger onClick={onRevert} loading={reverting}>
          {t('geodataHistory.revertTo', { version })}
        </Button>
      )}
    </>
  );
}

function VotePanel({
  pageId,
  version,
  onVoted,
}: {
  pageId: string;
  version: number;
  onVoted: () => void;
}) {
  const { mutate, mutation } = useCustomMutation();
  const [reason, setReason] = useState('');
  const { t } = useTranslation('resources');

  const vote = (decision: 'APPROVE' | 'REJECT') => {
    mutate(
      {
        url: `/adventure-pages/${pageId}/revisions/${version}/votes`,
        method: 'post',
        values: { decision, rejectionReason: decision === 'REJECT' && reason ? reason : undefined },
      },
      {
        onSuccess: () => {
          message.success(t('approval.voted'));
          onVoted();
        },
        onError: (err: unknown) => {
          const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          message.error(apiMessage || t('approval.voteError'));
        },
      },
    );
  };

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
      <Typography.Text type="secondary">{t('approval.adminVoteNotice')}</Typography.Text>
      <Space style={{ marginTop: 8, display: 'flex' }}>
        <Button type="primary" onClick={() => vote('APPROVE')} loading={mutation.isPending}>
          {t('approval.approve')}
        </Button>
        <Input
          placeholder={t('approval.declineReasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ width: 220 }}
        />
        <Button danger onClick={() => vote('REJECT')} loading={mutation.isPending}>
          {t('approval.decline')}
        </Button>
      </Space>
    </div>
  );
}
