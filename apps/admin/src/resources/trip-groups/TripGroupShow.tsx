import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/format';

interface TripGroupMember {
  id: string;
  userId: string;
  role: string;
  user: { username: string };
}

interface TripGroupDetail {
  id: string;
  title: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  displayStatus: string;
  members: TripGroupMember[];
}

const STATUS_COLOR: Record<string, string> = {
  UPCOMING: 'blue',
  ONGOING: 'green',
  EXPIRED: 'default',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export const TripGroupShow = () => {
  const { query, result: record } = useShow<TripGroupDetail>({ resource: 'trip-groups' });
  const { t } = useTranslation('resources');

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="trip-groups" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t('trip-groups.fields.title')}>{record.title}</Descriptions.Item>
            <Descriptions.Item label={t('trip-groups.fields.dates')}>
              {formatDate(record.dateStart)} – {formatDate(record.dateEnd)}
            </Descriptions.Item>
            <Descriptions.Item label={t('trip-groups.fields.status')}>
              <Tag color={STATUS_COLOR[record.displayStatus] ?? 'default'}>{record.displayStatus}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('trip-groups.fields.description')}
          </Typography.Title>
          <Typography.Paragraph type="secondary">{record.description}</Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('trip-groups.membersHeading', { count: record.members.length })}
          </Typography.Title>
          <Table dataSource={record.members} rowKey="id" pagination={false} size="small">
            <Table.Column dataIndex={['user', 'username']} title={t('trip-groups.fields.username')} />
            <Table.Column
              dataIndex="role"
              title={t('trip-groups.fields.role')}
              render={(role: string) => <Tag color={role === 'ORGANIZER' ? 'green' : 'default'}>{role}</Tag>}
            />
          </Table>
        </>
      )}
    </Show>
  );
};
