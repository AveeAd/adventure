import { useCustom, useCustomMutation, useInvalidate } from '@refinedev/core';
import { Button, Collapse, Descriptions, Input, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../lib/format';
import { GeometryMap } from '../../components/GeometryMap';
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

const APPROVAL_TAG_COLOR: Record<string, string> = { PENDING: 'gold', APPROVED: 'green', REJECTED: 'red' };

interface DiffResult {
  from: number;
  to: number;
  changes: { field: string; from: unknown; to: unknown }[];
  geometry: {
    from: GeoJSON.Geometry;
    to: GeoJSON.Geometry;
    maxDeviationMeters: number;
    geometryChanged: boolean;
    vertexDelta?: number;
    lengthDeltaMeters?: number;
  };
}

// Read-only revision timeline for TrailShow/SpotShow - expand a row to see
// its diff against the prior version (geometry overlay + scalar stats), plus
// a revert action reusing the same public endpoint the contribute UI uses.
// No new Refine resource: revisions aren't independently CRUDable, staying
// inside admin's "read + moderate, not full authoring" boundary. See
// GEODATA_HISTORY.md's Admin section.
export function GeodataHistory({ resource, id }: { resource: 'trails' | 'spots'; id: string }) {
  const { result, query } = useCustom<RevisionSummary[]>({
    url: `/${resource}/${id}/revisions`,
    method: 'get',
  });
  const invalidate = useInvalidate();
  const { mutate: revertMutate, mutation: revertMutation } = useCustomMutation();
  const { t } = useTranslation('resources');

  const revisions = (Array.isArray(result?.data) ? [...result.data] : []).sort((a, b) => b.version - a.version);

  const revert = (version: number) => {
    revertMutate(
      { url: `/${resource}/${id}/revisions/${version}/revert`, method: 'post', values: {} },
      {
        onSuccess: () => {
          message.success(t('geodataHistory.reverted', { version }));
          invalidate({ resource, invalidates: ['detail', 'list'], id });
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
            <Tag color={APPROVAL_TAG_COLOR[revision.approvalStatus]}>
              {t(`approval.status.${revision.approvalStatus}`)}
            </Tag>
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
            <RevisionDiffPanel
              resource={resource}
              id={id}
              version={revision.version}
              canRevert={revision.version !== revisions[0]?.version}
              onRevert={() => revert(revision.version)}
              reverting={revertMutation.isPending}
            />
            {revision.approvalStatus === 'PENDING' && (
              <VotePanel
                resource={resource}
                id={id}
                version={revision.version}
                onVoted={() => {
                  invalidate({ resource, invalidates: ['detail', 'list'], id });
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

function RevisionDiffPanel({
  resource,
  id,
  version,
  canRevert,
  onRevert,
  reverting,
}: {
  resource: 'trails' | 'spots';
  id: string;
  version: number;
  canRevert: boolean;
  onRevert: () => void;
  reverting: boolean;
}) {
  const { result, query } = useCustom<DiffResult>({
    url: `/${resource}/${id}/diff`,
    method: 'get',
    config: { query: { from: Math.max(1, version - 1), to: version } },
    queryOptions: { enabled: version > 1 },
  });
  const { t } = useTranslation('resources');

  if (version === 1) {
    return (
      <p style={{ color: '#888' }}>
        {t('geodataHistory.firstRevision')}
      </p>
    );
  }

  if (query.isLoading || !result?.data || !('changes' in result.data)) {
    return <p>{t('geodataHistory.loadingDiff')}</p>;
  }

  const diff = result.data;

  return (
    <>
      {diff.changes.length > 0 && (
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
          {diff.changes.map((change) => (
            <Descriptions.Item key={change.field} label={change.field}>
              {String(change.from ?? '—')} → {String(change.to ?? '—')}
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}

      <Space style={{ marginBottom: 12 }}>
        <Tag color={diff.geometry.geometryChanged ? 'blue' : 'default'}>
          {diff.geometry.geometryChanged ? t('geodataHistory.geometryChanged') : t('geodataHistory.geometryUnchanged')}
        </Tag>
        {diff.geometry.geometryChanged && (
          <span style={{ color: '#888' }}>
            {t('geodataHistory.maxDeviation', { value: Math.round(diff.geometry.maxDeviationMeters) })}
            {diff.geometry.lengthDeltaMeters !== undefined &&
              t('geodataHistory.lengthDelta', { value: diff.geometry.lengthDeltaMeters })}
            {diff.geometry.vertexDelta !== undefined &&
              t('geodataHistory.vertexDelta', { value: diff.geometry.vertexDelta })}
          </span>
        )}
      </Space>

      <GeometryMap geometry={diff.geometry.to} compareGeometry={diff.geometry.from} />

      {canRevert && (
        <Button style={{ marginTop: 12 }} danger onClick={onRevert} loading={reverting}>
          {t('geodataHistory.revertTo', { version })}
        </Button>
      )}
    </>
  );
}

// MILESTONE_3.md §5.3: an admin/moderator vote always finalizes immediately
// in the direction cast, no threshold - see resolveVoteOutcome. Shown for
// any still-PENDING revision, mirroring apps/public's VoteControls.
function VotePanel({
  resource,
  id,
  version,
  onVoted,
}: {
  resource: 'trails' | 'spots';
  id: string;
  version: number;
  onVoted: () => void;
}) {
  const { mutate, mutation } = useCustomMutation();
  const [reason, setReason] = useState('');
  const { t } = useTranslation('resources');

  const vote = (decision: 'APPROVE' | 'REJECT') => {
    mutate(
      {
        url: `/${resource}/${id}/revisions/${version}/votes`,
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
