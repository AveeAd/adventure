import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: 'green',
  UNVERIFIED: 'default',
  NEEDS_REVIEW: 'orange',
};

export const TrailList = () => {
  const { tableProps } = useTable({ resource: 'trails', syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" render={(name: string | null) => name ?? 'Trail'} />
        <Table.Column dataIndex="adventurePageTitle" title="Adventure page" />
        <Table.Column
          dataIndex="distanceMeters"
          title="Distance"
          render={(value: number | null) => (value ? `${(value / 1000).toFixed(1)} km` : '—')}
        />
        <Table.Column
          dataIndex="verificationStatus"
          title="Verification"
          render={(status: string) => <Tag color={STATUS_COLOR[status]}>{status.replaceAll('_', ' ')}</Tag>}
        />
        <Table.Column
          title="Actions"
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
