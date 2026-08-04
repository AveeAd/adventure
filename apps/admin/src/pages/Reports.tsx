import { useCustom, useCustomMutation } from '@refinedev/core';
import { Button, Card, Empty, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { UserRef } from '../components/UserRef';
import { formatDateTime } from '../lib/format';

type ReportStatus = 'PENDING' | 'UPHELD' | 'REJECTED';
type ReportTargetType =
  | 'ADVENTURE_PAGE'
  | 'PAGE_REVISION'
  | 'TRAIL'
  | 'TRAIL_REVISION'
  | 'SPOT'
  | 'SPOT_REVISION'
  | 'MEDIA'
  | 'TRIP_REPORT'
  | 'COMMENT';

interface ContentReportRow {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  createdAt: string;
}

// Only the target types with a real admin show page are worth linking to -
// the *_REVISION/MEDIA/COMMENT types resolve to a page's or trail's content
// indirectly, so this page shows the raw id rather than guessing a route.
const RESOURCE_ROUTE: Partial<Record<ReportTargetType, string>> = {
  ADVENTURE_PAGE: 'adventure-pages',
  TRAIL: 'trails',
  SPOT: 'spots',
  TRIP_REPORT: 'trip-reports',
};

// MILESTONE_3.md §9.2: "Reports" admin resource - a custom page in the
// ReviewQueue.tsx mold (a workflow action, not a CRUD edit form), since
// resolving is "uphold or reject with a note", not a field edit.
export function ReportsPage() {
  const { t } = useTranslation('resources');
  const [status, setStatus] = useState<ReportStatus>('PENDING');

  const { result, query, refetch } = useCustom<{ data: ContentReportRow[] }>({
    url: '/reports',
    method: 'get',
    config: { query: { status, pageSize: 100 } },
  });
  const rows = result?.data?.data ?? [];

  return (
    <Card title={t('reports.title')}>
      <Space style={{ marginBottom: 16 }}>
        <Select<ReportStatus>
          style={{ width: 200 }}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'PENDING', label: t('reports.status.PENDING') },
            { value: 'UPHELD', label: t('reports.status.UPHELD') },
            { value: 'REJECTED', label: t('reports.status.REJECTED') },
          ]}
        />
      </Space>

      {rows.length === 0 && !query.isLoading ? (
        <Empty description={t('reports.empty')} />
      ) : (
        <Table<ContentReportRow>
          rowKey="id"
          loading={query.isLoading}
          dataSource={rows}
          pagination={false}
          columns={[
            {
              title: t('reports.fields.reporter'),
              render: (_, row) => <UserRef userId={row.reporterId} />,
            },
            {
              title: t('reports.fields.target'),
              render: (_, row) => {
                const route = RESOURCE_ROUTE[row.targetType];
                return (
                  <>
                    <Tag>{t(`reports.targetType.${row.targetType}`)}</Tag>
                    {route ? (
                      <Link to={`/${route}/show/${row.targetId}`}>{row.targetId.slice(0, 8)}…</Link>
                    ) : (
                      <Typography.Text type="secondary">{row.targetId.slice(0, 8)}…</Typography.Text>
                    )}
                  </>
                );
              },
            },
            { title: t('reports.fields.reason'), dataIndex: 'reason', render: (v: string) => t(`reports.reason.${v}`) },
            { title: t('reports.fields.details'), dataIndex: 'details' },
            {
              title: t('reports.fields.submitted'),
              dataIndex: 'createdAt',
              render: (value: string) => formatDateTime(value),
            },
            {
              title: '',
              render: (_, row) =>
                row.status === 'PENDING' ? (
                  <ResolveControls reportId={row.id} onResolved={() => refetch()} />
                ) : (
                  <Tag color={row.status === 'UPHELD' ? 'red' : 'default'}>{t(`reports.status.${row.status}`)}</Tag>
                ),
            },
          ]}
        />
      )}
    </Card>
  );
}

function ResolveControls({ reportId, onResolved }: { reportId: string; onResolved: () => void }) {
  const { t } = useTranslation('resources');
  const { mutate, mutation } = useCustomMutation();
  const [note, setNote] = useState('');

  const resolve = (decision: 'UPHELD' | 'REJECTED') => {
    mutate(
      {
        url: `/reports/${reportId}/resolve`,
        method: 'patch',
        values: { decision, resolutionNote: note || undefined },
      },
      {
        onSuccess: () => {
          message.success(t('reports.resolved'));
          onResolved();
        },
        onError: () => message.error(t('reports.resolveError')),
      },
    );
  };

  return (
    <Space direction="vertical">
      <Input
        placeholder={t('reports.notePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: 200 }}
      />
      <Space>
        <Button danger onClick={() => resolve('UPHELD')} loading={mutation.isPending}>
          {t('reports.uphold')}
        </Button>
        <Button onClick={() => resolve('REJECTED')} loading={mutation.isPending}>
          {t('reports.reject')}
        </Button>
      </Space>
    </Space>
  );
}
