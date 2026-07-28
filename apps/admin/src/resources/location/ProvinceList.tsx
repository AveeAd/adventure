import { DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';

export const ProvinceList = () => {
  const { tableProps } = useTable({ resource: 'provinces', syncWithLocation: true });

  return (
    <List resource="provinces" title="Provinces">
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column dataIndex="isActive" title="Active" />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton resource="provinces" recordItemId={record.id} size="small" />
              <DeleteButton resource="provinces" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
