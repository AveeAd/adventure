import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';

export const TripReportList = () => {
  const { tableProps } = useTable({ resource: 'trip-reports', syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="title" title="Title" render={(title: string | null) => title ?? 'Trip report'} />
        <Table.Column dataIndex={['adventurePage', 'title']} title="Adventure page" />
        <Table.Column dataIndex={['author', 'email']} title="Author" />
        <Table.Column
          dataIndex="dateCompleted"
          title="Date completed"
          render={(value: string) => new Date(value).toLocaleDateString()}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="trip-reports" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
