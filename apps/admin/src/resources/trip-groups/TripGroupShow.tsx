import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Table, Tag, Typography } from 'antd';
import { formatDate } from '../../lib/format';

interface TripGroupMember {
  id: string;
  userId: string;
  role: string;
  user: { email: string };
}

interface TripGroupDetail {
  id: string;
  title: string;
  description: string | null;
  dateStart: string;
  dateEnd: string;
  members: TripGroupMember[];
}

export const TripGroupShow = () => {
  const { query, result: record } = useShow<TripGroupDetail>({ resource: 'trip-groups' });

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="trip-groups" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Title">{record.title}</Descriptions.Item>
            <Descriptions.Item label="Dates">
              {formatDate(record.dateStart)} – {formatDate(record.dateEnd)}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Description
          </Typography.Title>
          <Typography.Paragraph type="secondary">{record.description ?? 'No description'}</Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Members ({record.members.length})
          </Typography.Title>
          <Table dataSource={record.members} rowKey="id" pagination={false} size="small">
            <Table.Column dataIndex={['user', 'email']} title="Email" />
            <Table.Column
              dataIndex="role"
              title="Role"
              render={(role: string) => <Tag color={role === 'ORGANIZER' ? 'green' : 'default'}>{role}</Tag>}
            />
          </Table>
        </>
      )}
    </Show>
  );
};
