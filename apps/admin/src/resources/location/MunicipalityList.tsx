import { DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table } from 'antd';
import { useTranslation } from 'react-i18next';

export const MunicipalityList = () => {
  const { tableProps } = useTable({ resource: 'municipalities', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List resource="municipalities" title={t('municipalities.label')}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title={t('fields.name')} />
        <Table.Column dataIndex="slug" title={t('fields.slug')} />
        <Table.Column dataIndex="type" title={t('fields.type')} />
        <Table.Column dataIndex="isActive" title={t('fields.isActive')} />
        <Table.Column
          title={t('fields.actions')}
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
