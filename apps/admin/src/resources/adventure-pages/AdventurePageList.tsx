import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/format';

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: 'green',
  UNVERIFIED: 'default',
  NEEDS_REVIEW: 'orange',
};

export const AdventurePageList = () => {
  const { tableProps } = useTable({ resource: 'adventure-pages', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="title" title={t('adventure-pages.fields.title')} />
        <Table.Column dataIndex={['activityType', 'name']} title={t('adventure-pages.fields.activity')} />
        <Table.Column
          dataIndex="verificationStatus"
          title={t('adventure-pages.fields.verificationStatus')}
          render={(status: string) => <Tag color={STATUS_COLOR[status]}>{status.replaceAll('_', ' ')}</Tag>}
        />
        <Table.Column
          dataIndex="isActive"
          title={t('fields.isActive')}
          render={(isActive: boolean) => (
            <Tag color={isActive ? 'green' : 'red'}>{isActive ? t('users.yes') : t('users.no')}</Tag>
          )}
        />
        <Table.Column
          dataIndex="createdAt"
          title={t('adventure-pages.fields.created')}
          render={(value: string) => formatDate(value)}
        />
        <Table.Column
          title={t('fields.actions')}
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
