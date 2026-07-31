import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/format';

export const TripReportList = () => {
  const { tableProps } = useTable({ resource: 'trip-reports', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="title"
          title={t('trip-reports.fields.title')}
          render={(title: string | null) => title ?? t('trip-reports.defaultTitle')}
        />
        <Table.Column dataIndex={['adventurePage', 'title']} title={t('trip-reports.fields.adventurePage')} />
        <Table.Column dataIndex={['author', 'email']} title={t('trip-reports.fields.author')} />
        <Table.Column
          dataIndex="dateCompleted"
          title={t('trip-reports.fields.dateCompleted')}
          render={(value: string) => formatDate(value)}
        />
        <Table.Column
          title={t('fields.actions')}
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
