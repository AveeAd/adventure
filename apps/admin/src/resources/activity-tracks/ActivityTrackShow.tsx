import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../lib/format';
import { GeometryMap } from '../../components/GeometryMap';

interface ActivityTrackDetail {
  id: string;
  userId: string;
  name: string | null;
  notes: string | null;
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  ascentMeters: number | null;
  descentMeters: number | null;
  startedAt: string;
  finishedAt: string;
  elapsedSeconds: number;
  source: string;
  visibility: string;
}

export const ActivityTrackShow = () => {
  const { query, result: record } = useShow<ActivityTrackDetail>({ resource: 'activity-tracks' });
  const { t } = useTranslation('resources');

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="activity-tracks" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t('activity-tracks.fields.name')}>
              {record.name ?? t('activity-tracks.defaultName')}
            </Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.ownerUserId')}>{record.userId}</Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.distance')}>
              {(record.distanceMeters / 1000).toFixed(1)} km
            </Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.elapsed')}>
              {Math.round(record.elapsedSeconds / 60)} min
            </Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.ascent')}>{record.ascentMeters ?? '—'} m</Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.descent')}>{record.descentMeters ?? '—'} m</Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.started')}>{formatDateTime(record.startedAt)}</Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.source')}>
              <Tag>{record.source}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('activity-tracks.fields.visibility')}>
              <Tag color={record.visibility === 'PUBLIC' ? 'green' : 'default'}>{record.visibility}</Tag>
            </Descriptions.Item>
          </Descriptions>

          {record.notes && (
            <Descriptions bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label={t('activity-tracks.fields.notes')}>{record.notes}</Descriptions.Item>
            </Descriptions>
          )}

          <div style={{ marginTop: 24 }}>
            <GeometryMap geometry={record.geometry} />
          </div>
        </>
      )}
    </Show>
  );
};
