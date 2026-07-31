import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/format';

export const TripGroupList = () => {
  const { tableProps } = useTable({ resource: 'trip-groups', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="title" title={t('trip-groups.fields.title')} />
        <Table.Column dataIndex={['adventurePage', 'title']} title={t('trip-groups.fields.adventurePage')} />
        <Table.Column
          dataIndex="dateStart"
          title={t('trip-groups.fields.dates')}
          render={(_, record: BaseRecord) =>
            `${formatDate(record.dateStart)} – ${formatDate(record.dateEnd)}`
          }
        />
        <Table.Column dataIndex={['_count', 'members']} title={t('trip-groups.fields.members')} />
        <Table.Column
          title={t('fields.actions')}
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
