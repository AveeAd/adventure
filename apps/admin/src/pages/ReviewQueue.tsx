import { useCustom, useList } from '@refinedev/core';
import { Card, Empty, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../lib/format';

type TargetType = 'ADVENTURE_PAGE' | 'TRAIL' | 'SPOT';

interface PendingRevisionRow {
  targetType: TargetType;
  targetId: string;
  targetName: string | null;
  pageId: string;
  pageTitle: string;
  districtIds: string[];
  revisionId: string;
  version: number;
  editSummary: string | null;
  createdAt: string;
  approveCount: number;
  rejectCount: number;
  threshold: number;
}

interface District {
  id: string;
  name: string;
}

const RESOURCE_ROUTE: Record<TargetType, string> = {
  ADVENTURE_PAGE: 'adventure-pages',
  TRAIL: 'trails',
  SPOT: 'spots',
};

// MILESTONE_3.md §9.2: "Review queue (pending revisions, bulk approve/reject)."
// Bulk actions live on each row's target Show page (GeodataHistory/PageHistory's
// VotePanel, admin/mod votes finalize immediately) rather than duplicating the
// vote UI here - this page's job is triage: everything pending, across all
// three content types, filterable by type/district, with a jump-in link.
export function ReviewQueuePage() {
  const { t } = useTranslation('resources');
  const [type, setType] = useState<TargetType | undefined>();
  const [districtId, setDistrictId] = useState<string | undefined>();

  const { result: districtsResult } = useList<District>({
    resource: 'districts',
    pagination: { mode: 'off' },
  });
  const districts = districtsResult?.data ?? [];

  const { result, query } = useCustom<{ data: PendingRevisionRow[] }>({
    url: '/revisions/pending',
    method: 'get',
    config: { query: { pageSize: 100, type, districtId } },
  });
  const rows = result?.data?.data ?? [];

  return (
    <Card title={t('approval.reviewQueue.title')}>
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder={t('approval.reviewQueue.filterAllTypes')}
          style={{ width: 200 }}
          value={type}
          onChange={setType}
          options={[
            { value: 'ADVENTURE_PAGE', label: t('approval.reviewQueue.typePage') },
            { value: 'TRAIL', label: t('approval.reviewQueue.typeTrail') },
            { value: 'SPOT', label: t('approval.reviewQueue.typeSpot') },
          ]}
        />
        <Select
          allowClear
          showSearch
          placeholder={t('approval.reviewQueue.filterAllDistricts')}
          style={{ width: 240 }}
          value={districtId}
          onChange={setDistrictId}
          filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
          options={districts.map((d) => ({ value: d.id, label: d.name }))}
        />
      </Space>

      {rows.length === 0 && !query.isLoading ? (
        <Empty description={t('approval.reviewQueue.empty')} />
      ) : (
        <Table<PendingRevisionRow>
          rowKey="revisionId"
          loading={query.isLoading}
          dataSource={rows}
          pagination={false}
          columns={[
            {
              title: t('approval.reviewQueue.type'),
              dataIndex: 'targetType',
              render: (value: TargetType) => (
                <Tag>
                  {value === 'ADVENTURE_PAGE'
                    ? t('approval.reviewQueue.typePage')
                    : value === 'TRAIL'
                      ? t('approval.reviewQueue.typeTrail')
                      : t('approval.reviewQueue.typeSpot')}
                </Tag>
              ),
            },
            {
              title: t('adventure-pages.fields.title'),
              render: (_, row) => (
                <>
                  <div>{row.targetName ?? row.pageTitle}</div>
                  <Typography.Text type="secondary">
                    {row.pageTitle} · v{row.version}
                  </Typography.Text>
                </>
              ),
            },
            { title: t('approval.reviewQueue.editSummary'), dataIndex: 'editSummary' },
            {
              title: t('approval.reviewQueue.votes'),
              render: (_, row) => `${row.approveCount} / ${row.rejectCount} / ${row.threshold}`,
            },
            {
              title: t('approval.reviewQueue.submitted'),
              dataIndex: 'createdAt',
              render: (value: string) => formatDateTime(value),
            },
            {
              title: '',
              render: (_, row) => (
                <Link to={`/${RESOURCE_ROUTE[row.targetType]}/show/${row.targetId}`}>
                  {t('approval.reviewQueue.view')}
                </Link>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}
