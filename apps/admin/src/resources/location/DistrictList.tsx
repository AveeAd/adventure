import { DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';

export const DistrictList = () => {
  const { tableProps } = useTable({ resource: 'districts', syncWithLocation: true });

  return (
    <List resource="districts" title="Districts">
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column dataIndex="isActive" title="Active" />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton resource="districts" recordItemId={record.id} size="small" />
              <DeleteButton resource="districts" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
