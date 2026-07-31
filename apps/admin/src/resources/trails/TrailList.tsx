import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: 'green',
  UNVERIFIED: 'default',
  NEEDS_REVIEW: 'orange',
};

export const TrailList = () => {
  const { tableProps } = useTable({ resource: 'trails', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="name"
          title={t('trails.fields.name')}
          render={(name: string | null) => name ?? t('trails.defaultName')}
        />
        <Table.Column dataIndex="adventurePageTitle" title={t('trails.fields.adventurePage')} />
        <Table.Column
          dataIndex="distanceMeters"
          title={t('trails.fields.distance')}
          render={(value: number | null) => (value ? `${(value / 1000).toFixed(1)} km` : '—')}
        />
        <Table.Column
          dataIndex="verificationStatus"
          title={t('trails.fields.verification')}
          render={(status: string) => <Tag color={STATUS_COLOR[status]}>{status.replaceAll('_', ' ')}</Tag>}
        />
        <Table.Column
          title={t('fields.actions')}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="trails" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
