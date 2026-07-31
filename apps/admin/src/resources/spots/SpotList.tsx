import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

const STATUS_COLOR: Record<string, string> = {
  VERIFIED: 'green',
  UNVERIFIED: 'default',
  NEEDS_REVIEW: 'orange',
};

export const SpotList = () => {
  const { tableProps } = useTable({ resource: 'spots', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t('spots.fields.name')} />
        <Table.Column dataIndex="spotTypeName" title={t('spots.fields.type')} />
        <Table.Column dataIndex="adventurePageTitle" title={t('spots.fields.adventurePage')} />
        <Table.Column
          dataIndex="verificationStatus"
          title={t('spots.fields.verification')}
          render={(status: string) => <Tag color={STATUS_COLOR[status]}>{status.replaceAll('_', ' ')}</Tag>}
        />
        <Table.Column
          title={t('fields.actions')}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="spots" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
