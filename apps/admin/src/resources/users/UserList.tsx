import { EditButton, List, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { formatDate } from '../../lib/format';

export const UserList = () => {
  const { tableProps } = useTable({ resource: 'users', syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column dataIndex={['profile', 'name']} title="Name" render={(name: string | null) => name ?? '—'} />
        <Table.Column
          dataIndex="role"
          title="Role"
          render={(role: string) => <Tag color={role === 'ADMIN' ? 'green' : 'default'}>{role}</Tag>}
        />
        <Table.Column
          dataIndex="isActive"
          title="Active"
          render={(isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Yes' : 'No'}</Tag>}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Joined"
          render={(value: string) => formatDate(value)}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton resource="users" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
