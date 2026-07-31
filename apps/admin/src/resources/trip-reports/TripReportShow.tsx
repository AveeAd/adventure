import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Typography } from 'antd';
import { formatDate } from '../../lib/format';

interface TripReportDetail {
  id: string;
  title: string | null;
  description: string | null;
  dateCompleted: string;
  durationDays: number | null;
  actualCostAmount: number | null;
  currency: string;
  authorId: string;
  kudosCount: number;
  commentCount: number;
}

export const TripReportShow = () => {
  const { query, result: record } = useShow<TripReportDetail>({ resource: 'trip-reports' });

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="trip-reports" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Title">{record.title ?? 'Trip report'}</Descriptions.Item>
            <Descriptions.Item label="Author ID">{record.authorId}</Descriptions.Item>
            <Descriptions.Item label="Date completed">
              {formatDate(record.dateCompleted)}
            </Descriptions.Item>
            <Descriptions.Item label="Duration">
              {record.durationDays ? `${record.durationDays} days` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Cost">
              {record.actualCostAmount ? `${record.currency} ${record.actualCostAmount}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Kudos / Comments">
              {record.kudosCount} / {record.commentCount}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Description
          </Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }} type="secondary">
            {record.description ?? 'No description'}
          </Typography.Paragraph>
        </>
      )}
    </Show>
  );
};
