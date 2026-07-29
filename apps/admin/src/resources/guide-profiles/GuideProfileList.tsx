import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: 'green',
  UNVERIFIED: 'default',
  PENDING_LICENSE_REVIEW: 'orange',
};

interface GuideRow extends BaseRecord {
  specialties: { activityType: { name: string } }[];
  regions: { district: { name: string } }[];
  verificationStatus: string;
}

export const GuideProfileList = () => {
  const { tableProps } = useTable({ resource: 'guide-profiles', syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Specialties"
          render={(_, record: GuideRow) => record.specialties.map((s) => s.activityType.name).join(', ') || '—'}
        />
        <Table.Column
          title="Regions"
          render={(_, record: GuideRow) => record.regions.map((r) => r.district.name).join(', ') || '—'}
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
              <ShowButton resource="guide-profiles" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
