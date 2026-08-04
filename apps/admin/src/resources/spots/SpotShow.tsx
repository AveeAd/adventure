import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { GeometryMap } from '../../components/GeometryMap';
import { GeodataHistory } from '../common/GeodataHistory';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface SpotDetail {
  id: string;
  adventurePageId: string;
  spotTypeName: string;
  name: string;
  description: string | null;
  geometry: GeoJSON.Point;
  elevationMeters: number | null;
  verificationStatus: string;
  approvedRevisionId: string | null;
  pendingRevisionCount: number;
}

const STATUS_OPTIONS = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];

export const SpotShow = () => {
  const { query, result: record } = useShow<SpotDetail>({ resource: 'spots' });
  const { t } = useTranslation('resources');

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="spots" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t('spots.fields.name')}>{record.name}</Descriptions.Item>
            <Descriptions.Item label={t('spots.fields.type')}>{record.spotTypeName}</Descriptions.Item>
            <Descriptions.Item label={t('spots.fields.elevation')}>
              {record.elevationMeters ? `${record.elevationMeters}m` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.currentStatus')}>
              {!record.approvedRevisionId && <Tag color="gold">{t('approval.status.PENDING')}</Tag>}
              {record.pendingRevisionCount > 0 && (
                <Tag color="gold">{t('geodataHistory.pendingCount', { count: record.pendingRevisionCount })}</Tag>
              )}
              {record.approvedRevisionId && record.pendingRevisionCount === 0 && (
                <Tag color="green">{t('approval.status.APPROVED')}</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('spots.fields.description')}
          </Typography.Title>
          <Typography.Paragraph type="secondary">{record.description ?? t('spots.noDescription')}</Typography.Paragraph>

          <GeometryMap geometry={record.geometry} />

          <div style={{ marginTop: 24 }}>
            <VerificationStatusControl
              resource="spots"
              id={record.id}
              status={record.verificationStatus}
              options={STATUS_OPTIONS}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <Typography.Title level={5}>{t('spots.fields.history')}</Typography.Title>
            <GeodataHistory resource="spots" id={record.id} />
          </div>
        </>
      )}
    </Show>
  );
};
