import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('resources');

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="trip-reports" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t('trip-reports.fields.title')}>
              {record.title ?? t('trip-reports.defaultTitle')}
            </Descriptions.Item>
            <Descriptions.Item label={t('trip-reports.fields.authorId')}>{record.authorId}</Descriptions.Item>
            <Descriptions.Item label={t('trip-reports.fields.dateCompleted')}>
              {formatDate(record.dateCompleted)}
            </Descriptions.Item>
            <Descriptions.Item label={t('trip-reports.fields.duration')}>
              {record.durationDays ? t('trip-reports.durationDays', { count: record.durationDays }) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('trip-reports.fields.cost')}>
              {record.actualCostAmount ? `${record.currency} ${record.actualCostAmount}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('trip-reports.fields.kudosComments')}>
              {record.kudosCount} / {record.commentCount}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('trip-reports.fields.description')}
          </Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }} type="secondary">
            {record.description ?? t('trip-reports.noDescription')}
          </Typography.Paragraph>
        </>
      )}
    </Show>
  );
};
