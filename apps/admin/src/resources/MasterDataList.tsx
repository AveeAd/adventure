import { DeleteButton, EditButton, List, useTable } from '@refinedev/antd';
import { Space, Table } from 'antd';
import type { BaseRecord } from '@refinedev/core';
import { useTranslation } from 'react-i18next';
import type { MasterDataResourceConfig } from './config';

export const MasterDataList = ({ config }: { config: MasterDataResourceConfig }) => {
  const { tableProps } = useTable({ resource: config.resource, syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List resource={config.resource} title={t(`${config.resource}.label`, { defaultValue: config.label })}>
      <Table {...tableProps} rowKey="id">
        {config.listColumns.map((column) => (
          <Table.Column key={column} dataIndex={column} title={t(`fields.${column}`, { defaultValue: column })} />
        ))}
        <Table.Column
          title={t('fields.actions')}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton resource={config.resource} recordItemId={record.id} size="small" />
              <DeleteButton resource={config.resource} recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
