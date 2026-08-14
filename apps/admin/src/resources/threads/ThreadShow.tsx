import { DeleteButton, Show } from '@refinedev/antd';
import { useCustomMutation, useShow } from '@refinedev/core';
import { Button, Descriptions, Table, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../auth/auth-provider';

interface ThreadReplyRow {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

interface ThreadDetail {
  id: string;
  content: string;
  tag: string;
  isPinned: boolean;
  club?: { id: string; name: string };
  authorName?: string;
}

export const ThreadShow = () => {
  const { query, result: record } = useShow<ThreadDetail>({ resource: 'threads' });
  const { t } = useTranslation('resources');
  const { mutate, mutation } = useCustomMutation();
  // The replies list is @Public() on the API, so a plain fetch (no auth
  // header needed) is simpler and avoids Refine's useCustom query-key
  // caching semantics around a dynamic, initially-undefined url.
  const [replies, setReplies] = useState<ThreadReplyRow[]>([]);

  useEffect(() => {
    if (!record?.id) return;
    fetch(`${API_URL}/api/v1/threads/${record.id}/replies`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setReplies)
      .catch(() => setReplies([]));
  }, [record?.id]);

  const togglePin = () => {
    if (!record) return;
    mutate(
      { url: `/threads/${record.id}/moderate`, method: 'patch', values: { isPinned: !record.isPinned } },
      {
        onSuccess: () => {
          message.success(t('threads.pinUpdated'));
          query.refetch();
        },
        onError: () => message.error(t('threads.pinUpdateError')),
      },
    );
  };

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={
        <>
          <Button onClick={togglePin} loading={mutation.isPending}>
            {record?.isPinned ? t('threads.unpin') : t('threads.pin')}
          </Button>
          <DeleteButton resource="threads" recordItemId={record?.id} />
        </>
      }
    >
      {record && (
        <>
          <Descriptions bordered column={3} size="small">
            <Descriptions.Item label={t('threads.fields.club')}>{record.club?.name}</Descriptions.Item>
            <Descriptions.Item label={t('threads.fields.author')}>{record.authorName}</Descriptions.Item>
            <Descriptions.Item label={t('threads.fields.tag')}>
              <Tag>{record.tag}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('threads.fields.content')}
          </Typography.Title>
          <Typography.Paragraph>{record.content}</Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('threads.repliesHeading', { count: replies.length })}
          </Typography.Title>
          <Table dataSource={replies} rowKey="id" pagination={false} size="small">
            <Table.Column dataIndex="authorId" title={t('threads.fields.author')} />
            <Table.Column dataIndex="content" title={t('threads.fields.content')} />
          </Table>
        </>
      )}
    </Show>
  );
};
