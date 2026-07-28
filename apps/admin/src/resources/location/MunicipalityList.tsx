import { DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';

export const MunicipalityList = () => {
  const { tableProps } = useTable({ resource: 'municipalities', syncWithLocation: true });

  return (
    <List resource="municipalities" title="Municipalities">
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column dataIndex="type" title="Type" />
        <Table.Column dataIndex="isActive" title="Active" />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton resource="municipalities" recordItemId={record.id} size="small" />
              <DeleteButton resource="municipalities" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
