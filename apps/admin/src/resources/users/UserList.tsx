import { EditButton, List, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/format';

export const UserList = () => {
  const { tableProps } = useTable({ resource: 'users', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="email" title={t('users.fields.email')} />
        <Table.Column
          dataIndex={['profile', 'name']}
          title={t('users.fields.name')}
          render={(name: string | null) => name ?? '—'}
        />
        <Table.Column
          dataIndex="role"
          title={t('users.fields.role')}
          render={(role: 'ADMIN' | 'MODERATOR' | 'USER') => (
            <Tag color={role === 'ADMIN' ? 'green' : role === 'MODERATOR' ? 'blue' : 'default'}>
              {t(`users.roles.${role}`)}
            </Tag>
          )}
        />
        <Table.Column
          dataIndex={['guideProfile', 'guideLevel']}
          title={t('users.fields.guideLevel')}
          render={(level: number | null) => level ?? '—'}
        />
        <Table.Column
          dataIndex={['guideProfile', 'contributionPoints']}
          title={t('users.fields.contributionPoints')}
          render={(points: number | null) => points ?? '—'}
        />
        <Table.Column
          dataIndex="isActive"
          title={t('users.fields.isActive')}
          render={(isActive: boolean) => (
            <Tag color={isActive ? 'green' : 'red'}>{isActive ? t('users.yes') : t('users.no')}</Tag>
          )}
        />
        <Table.Column
          dataIndex="createdAt"
          title={t('users.fields.joined')}
          render={(value: string) => formatDate(value)}
        />
        <Table.Column
          title={t('fields.actions')}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton resource="users" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
