import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { formatDate } from '../../lib/format';

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: 'green',
  UNVERIFIED: 'default',
  NEEDS_REVIEW: 'orange',
};

export const AdventurePageList = () => {
  const { tableProps } = useTable({ resource: 'adventure-pages', syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="title" title="Title" />
        <Table.Column dataIndex={['activityType', 'name']} title="Activity" />
        <Table.Column
          dataIndex="verificationStatus"
          title="Verification"
          render={(status: string) => <Tag color={STATUS_COLOR[status]}>{status.replaceAll('_', ' ')}</Tag>}
        />
        <Table.Column
          dataIndex="isActive"
          title="Active"
          render={(isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Yes' : 'No'}</Tag>}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Created"
          render={(value: string) => formatDate(value)}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="adventure-pages" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
