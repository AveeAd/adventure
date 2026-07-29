import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';

export const TripGroupList = () => {
  const { tableProps } = useTable({ resource: 'trip-groups', syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="title" title="Title" />
        <Table.Column dataIndex={['adventurePage', 'title']} title="Adventure page" />
        <Table.Column
          dataIndex="dateStart"
          title="Dates"
          render={(_, record: BaseRecord) =>
            `${new Date(record.dateStart).toLocaleDateString()} – ${new Date(record.dateEnd).toLocaleDateString()}`
          }
        />
        <Table.Column dataIndex={['_count', 'members']} title="Members" />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="trip-groups" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
