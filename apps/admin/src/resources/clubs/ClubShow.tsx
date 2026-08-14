import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

interface ClubMember {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: { username: string };
}

interface ClubDetail {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  createdBy?: { username: string };
  members: ClubMember[];
}

export const ClubShow = () => {
  const { query, result: record } = useShow<ClubDetail>({ resource: 'clubs' });
  const { t } = useTranslation('resources');

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="clubs" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={3} size="small">
            <Descriptions.Item label={t('clubs.fields.name')}>{record.name}</Descriptions.Item>
            <Descriptions.Item label={t('clubs.fields.visibility')}>
              <Tag color={record.visibility === 'PUBLIC' ? 'green' : 'default'}>{record.visibility}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('clubs.fields.owner')}>{record.createdBy?.username}</Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('clubs.fields.description')}
          </Typography.Title>
          <Typography.Paragraph type="secondary">{record.description ?? t('clubs.noDescription')}</Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('clubs.membersHeading', { count: record.members.length })}
          </Typography.Title>
          <Table dataSource={record.members} rowKey="id" pagination={false} size="small">
            <Table.Column dataIndex={['user', 'username']} title={t('clubs.fields.username')} />
            <Table.Column
              dataIndex="role"
              title={t('clubs.fields.role')}
              render={(role: string) => <Tag color={role === 'OWNER' ? 'green' : 'default'}>{role}</Tag>}
            />
            <Table.Column
              dataIndex="status"
              title={t('clubs.fields.status')}
              render={(status: string) => (
                <Tag color={status === 'APPROVED' ? 'green' : status === 'PENDING' ? 'gold' : 'default'}>{status}</Tag>
              )}
            />
          </Table>
        </>
      )}
    </Show>
  );
};
