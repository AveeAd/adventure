import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

export const ClubList = () => {
  const { tableProps } = useTable({ resource: 'clubs', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t('clubs.fields.name')} />
        <Table.Column
          dataIndex="visibility"
          title={t('clubs.fields.visibility')}
          render={(visibility: string) => <Tag color={visibility === 'PUBLIC' ? 'green' : 'default'}>{visibility}</Tag>}
        />
        <Table.Column dataIndex={['createdBy', 'email']} title={t('clubs.fields.owner')} />
        <Table.Column dataIndex={['_count', 'members']} title={t('clubs.fields.members')} />
        <Table.Column
          title={t('fields.actions')}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="clubs" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
