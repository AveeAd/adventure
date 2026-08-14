import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export const ThreadList = () => {
  const { tableProps } = useTable({ resource: 'threads', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="content"
          title={t('threads.fields.content')}
          render={(content: string) => (
            <Typography.Text ellipsis style={{ maxWidth: 320 }}>
              {content}
            </Typography.Text>
          )}
        />
        <Table.Column dataIndex="tag" title={t('threads.fields.tag')} render={(tag: string) => <Tag>{tag}</Tag>} />
        <Table.Column dataIndex={['club', 'name']} title={t('threads.fields.club')} />
        <Table.Column dataIndex="authorName" title={t('threads.fields.author')} />
        <Table.Column
          dataIndex="isPinned"
          title={t('threads.fields.pinned')}
          render={(isPinned: boolean) => (isPinned ? <Tag color="blue">{t('threads.pinned')}</Tag> : null)}
        />
        <Table.Column dataIndex="replyCount" title={t('threads.fields.replies')} />
        <Table.Column
          title={t('fields.actions')}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="threads" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
