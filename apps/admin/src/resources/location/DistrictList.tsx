import { DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';
import { useTranslation } from 'react-i18next';

export const DistrictList = () => {
  const { tableProps } = useTable({ resource: 'districts', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List resource="districts" title={t('districts.label')}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t('fields.name')} />
        <Table.Column dataIndex="slug" title={t('fields.slug')} />
        <Table.Column dataIndex="isActive" title={t('fields.isActive')} />
        <Table.Column
          title={t('fields.actions')}
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
